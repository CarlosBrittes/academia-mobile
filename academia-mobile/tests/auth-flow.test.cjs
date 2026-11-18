const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAuthFlow } = require('../src/auth-flow.cjs');
const { ACTIVITIES, validateMember, RESET_MESSAGE } = require('../src/account-contract.cjs');
function fixture() {
  const primary = { uid: 'admin' }, profiles = new Map([['admin', { id: 'admin', name: 'Administrador', role: 'admin', active: true }]]);
  const calls = [];
  const students = new Map([['student-1', { name: 'Ana Aluna', teacherId: 'admin', deleting: false }]]);
  const adapter = {
    failProfile: false, failRollback: false,
    async signInPassword(email) { calls.push(['login', email]); return primary; },
    async signOut() { calls.push(['logout']); },
    async currentProfile() { return profiles.get(primary.uid); },
    async readProfile(uid) { return profiles.get(uid); },
    async readStudent(id) { return students.get(id); },
    async createCredentials(email, password) { calls.push(['credentials', email, password]); return { uid: 'new-member' }; },
    currentIdentity: () => primary,
    async reloadIdentity() {},
    async sendVerification(user) { calls.push(['verification', user.uid]); },
    async deleteCredentials(user) { calls.push(['rollback', user.uid]); if (adapter.failRollback) throw new Error('falha rollback'); },
    async finishProvisioning() { calls.push(['secondary-signout']); },
    async saveProfile(uid, data) { if (adapter.failProfile) throw new Error('sem permissão'); profiles.set(uid, data); },
    async saveStudentProfile(uid, data) {
      if (adapter.failProfile) throw new Error('sem permissão');
      profiles.set(uid, data);
      Object.assign(students.get(data.studentId), { authUid: uid, email: data.email });
    },
    async listProfiles() { return [...profiles.values()]; },
    async sendReset(email) { calls.push(['reset', email]); },
    async reauthenticate(password) { calls.push(['reauthenticate', password]); },
    async updatePassword(password) { calls.push(['update-password', password]); },
  };
  return { primary, profiles, students, calls, adapter, flow: createAuthFlow(adapter) };
}
const member = { name: 'Marina Costa', email: ' Marina@Example.com ', role: 'teacher', activity: 'Pilates', password: 'Senha inicial 123', confirmation: 'Senha inicial 123' };
test('contrato aceita as cinco atividades e impede papéis desconhecidos', () => {
  assert.deepEqual(ACTIVITIES, ['Personal', 'Treinamento personalizado', 'Pilates', 'Nutricionista', 'Fisioterapeuta']);
  for (const activity of ACTIVITIES) assert.equal(validateMember({ ...member, activity }).activity, activity);
  assert.throws(() => validateMember({ ...member, activity: 'Outra' }), /atividade/);
  assert.throws(() => validateMember({ ...member, role: 'superuser' }), /perfil/);
  assert.equal(validateMember({ ...member, role: 'admin' }).activity, null);
});
test('login consulta perfil ativo e normaliza o e-mail', async () => {
  const f = fixture();
  assert.equal((await f.flow.login(' Admin@Example.com ', 'senha')).role, 'admin');
  assert.deepEqual(f.calls, [['login', 'admin@example.com']]);
});
test('perfil inexistente, inválido ou desativado encerra a sessão', async () => {
  for (const profile of [undefined, { active: false, role: 'admin' }, { active: true, role: 'outro' }]) {
    const f = fixture(); f.profiles.set('admin', profile);
    await assert.rejects(f.flow.login('a@example.com', 'senha'), /perfil/);
    assert.deepEqual(f.calls.at(-1), ['logout']);
  }
});
test('criação mantém a sessão principal e não grava senha no perfil', async () => {
  const f = fixture();
  const result = await f.flow.createMember(member);
  assert.equal(result.id, 'new-member');
  assert.equal(result.email, 'marina@example.com');
  assert.equal(f.primary.uid, 'admin');
  assert.equal(JSON.stringify(f.profiles.get('new-member')).includes(member.password), false);
  assert.equal(f.profiles.get('new-member').password, undefined);
  assert.equal(result.verificationSent, true);
  assert.deepEqual(f.calls.map(call => call[0]), ['credentials', 'verification', 'secondary-signout']);
});
test('administrador também cadastra outro administrador', async () => {
  const f = fixture();
  const result = await f.flow.createMember({ ...member, role: 'admin' });
  assert.equal(result.role, 'admin'); assert.equal(result.activity, null);
});
test('professor não cria nem lista acessos', async () => {
  const f = fixture(); f.profiles.set('admin', { active: true, role: 'teacher' });
  await assert.rejects(f.flow.createMember(member), /administrador/);
  await assert.rejects(f.flow.listMembers(), /administrador/);
  assert.deepEqual(f.calls, []);
});
test('validação rejeita senha curta ou confirmação incorreta antes de criar conta', async () => {
  const f = fixture();
  await assert.rejects(f.flow.createMember({ ...member, password: 'curta' }), /10 a 128/);
  await assert.rejects(f.flow.createMember({ ...member, confirmation: 'diferente' }), /confirmação/);
  assert.deepEqual(f.calls, []);
});
test('falha no perfil desfaz a conta Auth nova e limpa a sessão secundária', async () => {
  const f = fixture(); f.adapter.failProfile = true;
  await assert.rejects(f.flow.createMember(member), /permissão/);
  assert.deepEqual(f.calls.map(call => call[0]), ['credentials', 'rollback', 'secondary-signout']);
  assert.equal(f.primary.uid, 'admin');
});
test('falha de compensação orienta conferir as duas partes no Console', async () => {
  const f = fixture(); f.adapter.failProfile = true; f.adapter.failRollback = true;
  await assert.rejects(f.flow.createMember(member), /Authentication.*Firestore/);
  assert.deepEqual(f.calls.at(-1), ['secondary-signout']);
});
test('recuperação usa Firebase e mantém resposta genérica para endereço inexistente', async () => {
  const f = fixture();
  assert.deepEqual(await f.flow.requestPasswordReset(' Cliente@Example.com '), { message: RESET_MESSAGE });
  assert.deepEqual(f.calls, [['reset', 'cliente@example.com']]);
  f.adapter.sendReset = async () => { throw Object.assign(new Error(), { code: 'auth/user-not-found' }); };
  assert.deepEqual(await f.flow.requestPasswordReset('inexistente@example.com'), { message: RESET_MESSAGE });
});
test('falha de rede na recuperação é exibida e não confirma envio', async () => {
  const f = fixture(); f.adapter.sendReset = async () => { throw new Error('sem rede'); };
  await assert.rejects(f.flow.requestPasswordReset('a@example.com'), /sem rede/);
});
test('troca opcional exige senha atual, confirmação e reautenticação', async () => {
  const f = fixture();
  await assert.rejects(f.flow.changePassword('', 'Nova senha pessoal', 'Nova senha pessoal'), /atual/);
  await assert.rejects(f.flow.changePassword('atual', 'Nova senha pessoal', 'diferente'), /confirmação/);
  assert.deepEqual(f.calls, []);
  await f.flow.changePassword('atual', 'Nova senha pessoal', 'Nova senha pessoal');
  assert.deepEqual(f.calls, [['reauthenticate', 'atual'], ['update-password', 'Nova senha pessoal']]);
});
test('reautenticação rejeitada impede gravação da senha', async () => {
  const f = fixture(); f.adapter.reauthenticate = async () => { throw new Error('senha atual incorreta'); };
  await assert.rejects(f.flow.changePassword('errada', 'Nova senha pessoal', 'Nova senha pessoal'), /incorreta/);
  assert.deepEqual(f.calls, []);
});

test('confirmação é enviada para a conta nova de qualquer atividade ou papel', async () => {
  for (const activity of ACTIVITIES) {
    const f = fixture();
    const saved = await f.flow.createMember({ ...member, activity });
    assert.equal(saved.verificationSent, true);
    assert.deepEqual(f.calls.find(call => call[0] === 'verification'), ['verification', 'new-member']);
  }
  const f = fixture();
  assert.equal((await f.flow.createMember({ ...member, role: 'admin' })).verificationSent, true);
});

test('falha no e-mail mantém conta/perfil e permite reenvio posterior', async () => {
  const f = fixture();
  f.adapter.sendVerification = async () => { throw new Error('cota de envio atingida'); };
  const saved = await f.flow.createMember(member);
  assert.equal(saved.verificationSent, false);
  assert.equal(f.profiles.has('new-member'), true);
  assert.equal(f.calls.some(call => call[0] === 'rollback'), false);
  assert.equal(f.primary.uid, 'admin');
  assert.deepEqual(f.calls.at(-1), ['secondary-signout']);
});

test('conta existente pode reenviar confirmação e consultar confirmação recente', async () => {
  const f = fixture();
  assert.deepEqual(await f.flow.requestEmailVerification(), { emailVerified: false });
  assert.deepEqual(f.calls, [['verification', 'admin']]);
  f.adapter.reloadIdentity = async user => { user.emailVerified = true; };
  assert.deepEqual(await f.flow.checkEmailVerification(), { emailVerified: true });
  await f.flow.requestEmailVerification();
  assert.equal(f.calls.length, 1);
  assert.equal((await f.flow.login('admin@example.com', 'senha')).emailVerified, true);
});

test('falha de reenvio é propagada sem encerrar a sessão ou confirmar envio', async () => {
  const f = fixture();
  f.adapter.sendVerification = async () => { throw new Error('sem rede'); };
  await assert.rejects(f.flow.requestEmailVerification(), /sem rede/);
  assert.deepEqual(f.calls, []);
});

const studentAccess = { ...member, studentId: 'student-1', email: ' Ana@Example.com ' };
test('professor libera acesso vinculado ao aluno sem trocar sua sessão nem persistir a senha', async () => {
  const f = fixture(); f.profiles.get('admin').role = 'teacher';
  const saved = await f.flow.createStudentAccess(studentAccess);
  assert.equal(saved.role, 'student'); assert.equal(saved.name, 'Ana Aluna'); assert.equal(saved.email, 'ana@example.com');
  assert.equal(saved.studentId, 'student-1'); assert.equal(saved.verificationSent, true);
  assert.equal(f.primary.uid, 'admin'); assert.equal(f.students.get('student-1').authUid, 'new-member');
  assert.equal(JSON.stringify([...f.profiles.values(), ...f.students.values()]).includes(member.password), false);
  assert.deepEqual(f.calls.at(-1), ['secondary-signout']);
});

test('acesso do aluno exige e-mail e senha válidos, dono correto e cadastro sem acesso prévio', async () => {
  for (const change of [{ email: '' }, { password: 'curta' }, { confirmation: 'diferente' }, { studentId: '../fora' }]) {
    const f = fixture(); await assert.rejects(f.flow.createStudentAccess({ ...studentAccess, ...change }));
    assert.deepEqual(f.calls, []);
  }
  for (const student of [undefined, { teacherId: 'outro' }, { teacherId: 'admin', deleting: true }, { teacherId: 'admin', authUid: 'exists' }]) {
    const f = fixture(); f.profiles.get('admin').role = 'teacher'; f.students.set('student-1', student);
    await assert.rejects(f.flow.createStudentAccess(studentAccess)); assert.deepEqual(f.calls, []);
  }
});

test('falha ao vincular acesso remove credenciais novas; falha no e-mail mantém o vínculo', async () => {
  const f = fixture(); f.adapter.failProfile = true;
  await assert.rejects(f.flow.createStudentAccess(studentAccess), /permissão/);
  assert.deepEqual(f.calls.map(call => call[0]), ['credentials', 'rollback', 'secondary-signout']);
  assert.equal(f.students.get('student-1').authUid, undefined);
  const g = fixture(); g.adapter.sendVerification = async () => { throw new Error('sem rede'); };
  assert.equal((await g.flow.createStudentAccess(studentAccess)).verificationSent, false);
  assert.equal(g.students.get('student-1').authUid, 'new-member');
});

test('aluno entra com vínculo válido, troca senha e não gerencia acessos ou equipe', async () => {
  const f = fixture();
  await f.flow.createStudentAccess(studentAccess); f.primary.uid = 'new-member';
  assert.equal((await f.flow.login('ana@example.com', 'senha')).studentId, 'student-1');
  await f.flow.changePassword('senha atual', 'Nova senha pessoal', 'Nova senha pessoal');
  await assert.rejects(f.flow.listMembers(), /administrador/);
  await assert.rejects(f.flow.createMember(member), /administrador/);
  await assert.rejects(f.flow.createStudentAccess(studentAccess), /equipe/);
});

test('aluno sem vínculo válido não entra e alunos não aparecem na lista da equipe', async () => {
  for (const invalid of [null, { authUid: 'outro' }, { authUid: 'new-member', deleting: true }]) {
    const f = fixture(); await f.flow.createStudentAccess(studentAccess);
    assert.equal((await f.flow.listMembers()).length, 1);
    f.primary.uid = 'new-member'; f.students.set('student-1', invalid);
    await assert.rejects(f.flow.login('ana@example.com', 'senha'), /indisponível/);
    assert.deepEqual(f.calls.at(-1), ['logout']);
  }
});
