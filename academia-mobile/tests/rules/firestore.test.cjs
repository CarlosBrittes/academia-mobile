const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, collection, setDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, where, runTransaction, writeBatch } = require('firebase/firestore');
let env;
const profile = (role, name = 'Profissional Teste') => ({ name, email: `${role}@example.com`, role, activity: role === 'admin' ? null : 'Pilates', active: true, createdAt: Timestamp.fromMillis(0) });
const student = (teacherId = 'teacher') => ({ name: 'Aluno Teste', phone: '5511999999999', goal: 'Fortalecimento', photo: null, teacherId, deleting: false, createdAt: Timestamp.fromMillis(0), updatedAt: Timestamp.fromMillis(0) });
const record = (uid = 'teacher') => ({ category: 'Treino', title: 'Treino A', content: '', performedOn: null, attachment: null, exercises: [], meals: [], author: 'Profissional Teste', authorId: uid, date: serverTimestamp(), updatedAt: serverTimestamp() });
const dbFor = uid => env.authenticatedContext(uid).firestore();
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-studio64', firestore: { rules: readFileSync(join(__dirname, '../../firestore.rules'), 'utf8') } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'profiles/admin'), profile('admin')),
      setDoc(doc(db, 'profiles/teacher'), profile('teacher')),
      setDoc(doc(db, 'profiles/other'), profile('teacher')),
      setDoc(doc(db, 'students/own'), student()),
      setDoc(doc(db, 'students/other'), student('other')),
    ]);
  });
});
after(async () => { await env?.cleanup(); });
test('anônimo não lê perfis, alunos nem registros', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'profiles/admin')));
  await assertFails(getDoc(doc(db, 'students/own')));
  await assertFails(getDocs(collection(db, 'students/own/records')));
});
test('professor lê o próprio perfil; não lê nem lista a equipe', async () => {
  const db = dbFor('teacher');
  await assertSucceeds(getDoc(doc(db, 'profiles/teacher')));
  await assertFails(getDoc(doc(db, 'profiles/admin')));
  await assertFails(getDocs(collection(db, 'profiles')));
});
test('administrador cadastra professor e outro administrador sem campo de senha', async () => {
  const db = dbFor('admin');
  for (const role of ['teacher', 'admin']) await assertSucceeds(setDoc(doc(db, `profiles/new-${role}`), { ...profile(role), createdAt: serverTimestamp() }));
  await assertSucceeds(getDocs(collection(db, 'profiles')));
  await assertFails(setDoc(doc(db, 'profiles/password'), { ...profile('teacher'), password: 'nao-permitida', createdAt: serverTimestamp() }));
});
test('professor não cria contas nem promove a si mesmo', async () => {
  const db = dbFor('teacher');
  await assertFails(setDoc(doc(db, 'profiles/new'), { ...profile('admin'), createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'profiles/teacher'), { role: 'admin' }));
  await assertFails(updateDoc(doc(db, 'profiles/teacher'), { active: true }));
});
test('uma conta Auth sem perfil não consegue se autorizar', async () => {
  const db = dbFor('unprovisioned');
  await assertSucceeds(getDoc(doc(db, 'profiles/unprovisioned')));
  await assertFails(setDoc(doc(db, 'profiles/unprovisioned'), { ...profile('admin'), createdAt: serverTimestamp() }));
  await assertFails(getDocs(collection(db, 'students')));
});
test('somente as cinco atividades e papéis esperados são aceitos', async () => {
  const db = dbFor('admin');
  for (const activity of ['Personal', 'Treinamento personalizado', 'Pilates', 'Nutricionista', 'Fisioterapeuta']) await assertSucceeds(setDoc(doc(db, `profiles/p-${activity.replace(/ /g, '-')}`), { ...profile('teacher'), activity, createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'profiles/invalid'), { ...profile('teacher'), activity: 'Outra', createdAt: serverTimestamp() }));
});
test('consulta de professor precisa limitar o responsável; administrador vê todos', async () => {
  const db = dbFor('teacher');
  await assertSucceeds(getDoc(doc(db, 'students/own')));
  await assertFails(getDoc(doc(db, 'students/other')));
  await assertFails(getDocs(collection(db, 'students')));
  await assertSucceeds(getDocs(query(collection(db, 'students'), where('teacherId', '==', 'teacher'))));
  await assertSucceeds(getDocs(collection(dbFor('admin'), 'students')));
});
test('criação de aluno usa responsável autenticado, datas do servidor e campos limitados', async () => {
  const db = dbFor('teacher');
  await assertSucceeds(runTransaction(db, async tx => {
    const ref = doc(db, 'students/new');
    await tx.get(ref);
    tx.set(ref, { ...student(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }));
  await assertFails(setDoc(doc(db, 'students/forged'), { ...student('other'), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'students/raw-uri'), { ...student(), photo: { uri: 'data:image/png;base64,abc' }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});
test('responsável e dados anteriores do aluno não podem ser adulterados', async () => {
  const db = dbFor('teacher');
  await assertFails(updateDoc(doc(db, 'students/own'), { teacherId: 'other', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'students/own'), { name: 'Nome adulterado', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'students/other'), { updatedAt: serverTimestamp() }));
});
test('acompanhamento é criado em transação com autoria e data do servidor', async () => {
  const db = dbFor('teacher');
  await assertSucceeds(runTransaction(db, async tx => {
    const parent = doc(db, 'students/own');
    const target = doc(db, 'students/own/records/r1');
    await tx.get(parent); await tx.get(target);
    tx.set(target, record());
    tx.update(parent, { updatedAt: serverTimestamp() });
  }));
  await assertSucceeds(getDocs(collection(db, 'students/own/records')));
  await assertFails(getDocs(collection(dbFor('other'), 'students/own/records')));
  await assertFails(updateDoc(doc(db, 'students/own/records/r1'), { title: 'Sobrescrita' }));
});
test('registro isolado e autoria forjada são rejeitados', async () => {
  const db = dbFor('teacher');
  await assertFails(setDoc(doc(db, 'students/own/records/isolated'), record()));
  const batch = writeBatch(db);
  batch.set(doc(db, 'students/own/records/forged'), record('other'));
  batch.update(doc(db, 'students/own'), { updatedAt: serverTimestamp() });
  await assertFails(batch.commit());
});
test('exclusão exige estado pendente, bloqueia novos registros e permite limpar filhos', async () => {
  const db = dbFor('teacher');
  await assertFails(deleteDoc(doc(db, 'students/own')));
  await assertSucceeds(updateDoc(doc(db, 'students/own'), { deleting: true, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'students/own'), { deleting: false, updatedAt: serverTimestamp() }));
  const batch = writeBatch(db);
  batch.set(doc(db, 'students/own/records/new'), record());
  batch.update(doc(db, 'students/own'), { updatedAt: serverTimestamp() });
  await assertFails(batch.commit());
  await assertSucceeds(deleteDoc(doc(db, 'students/own/records/missing')));
  await assertSucceeds(deleteDoc(doc(db, 'students/own')));
});
test('perfil desativado perde acesso ao banco mesmo com uma sessão Auth', async () => {
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'profiles/teacher'), { active: false }));
  await assertFails(getDoc(doc(dbFor('teacher'), 'students/own')));
  await assertFails(getDocs(collection(dbFor('teacher'), 'students/own/records')));
});

test('metadados locais são aceitos sem permitir URI, URL, token ou referência externa', async () => {
  const db = dbFor('teacher');
  const asset = { localKey: 'foto-local', name: 'foto.png', mimeType: 'image/png', size: 100, width: null, height: null };
  await assertSucceeds(setDoc(doc(db, 'students/local-photo'), { ...student(), photo: asset, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  for (const extra of [{ uri: 'file:///privado' }, { url: 'https://servidor.example/arquivo' }, { accessToken: 'segredo' }, { externalFileId: 'arquivo-123' }]) {
    await assertFails(setDoc(doc(db, `students/invalid-${Object.keys(extra)[0]}`), { ...student(), photo: { ...asset, ...extra }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  }
});

test('avaliação e histórico com metadados do PDF permanecem compatíveis com a transação', async () => {
  const db = dbFor('teacher');
  const batch = writeBatch(db);
  batch.set(doc(db, 'students/own/records/local-pdf'), { ...record(), category: 'Bioimpedância', performedOn: '2026-11-16', attachment: { localKey: 'pdf-local', name: 'avaliacao.pdf', mimeType: 'application/pdf', size: 1000, width: null, height: null } });
  batch.update(doc(db, 'students/own'), { updatedAt: serverTimestamp() });
  await assertSucceeds(batch.commit());
  const saved = await assertSucceeds(getDoc(doc(db, 'students/own/records/local-pdf')));
  assert.equal(saved.data().performedOn, '2026-11-16');
  assert.equal(saved.data().attachment.name, 'avaliacao.pdf');
});

const fileData = (ownerId = 'teacher', studentId = 'own') => ({ ownerId, studentId, name: 'foto.png', mimeType: 'image/png', size: 3, width: null, height: null, chunkCount: 1, status: 'uploading', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
test('arquivo pode ser enviado antes do aluno e vinculado ao cadastro com foto', async () => {
  const db = dbFor('teacher');
  await assertSucceeds(setDoc(doc(db, 'files/new-photo'), fileData('teacher', 'new-with-photo')));
  await assertSucceeds(setDoc(doc(db, 'files/new-photo/chunks/0'), { index: 0, data: 'AAEC' }));
  await assertSucceeds(updateDoc(doc(db, 'files/new-photo'), { status: 'ready', updatedAt: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(db, 'students/new-with-photo'), { ...student(), photo: { fileId: 'new-photo', name: 'foto.png', mimeType: 'image/png', size: 3, width: null, height: null }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  assert.equal((await assertSucceeds(getDoc(doc(db, 'files/new-photo/chunks/0')))).data().data, 'AAEC');
});
test('arquivos seguem isolamento de alunos; admin e responsável abrem arquivo enviado pelo admin', async () => {
  const adminDb = dbFor('admin');
  await assertSucceeds(setDoc(doc(adminDb, 'files/admin-photo'), fileData('admin')));
  await assertSucceeds(setDoc(doc(adminDb, 'files/admin-photo/chunks/0'), { index: 0, data: 'AAEC' }));
  await assertSucceeds(updateDoc(doc(adminDb, 'files/admin-photo'), { status: 'ready', updatedAt: serverTimestamp() }));
  await assertSucceeds(getDoc(doc(dbFor('teacher'), 'files/admin-photo/chunks/0')));
  await assertFails(getDoc(doc(dbFor('other'), 'files/admin-photo')));
  await assertFails(getDoc(doc(dbFor('other'), 'files/admin-photo/chunks/0')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'files/admin-photo/chunks/0')));
  await assertSucceeds(getDocs(query(collection(dbFor('teacher'), 'files'), where('studentId', '==', 'own'))));
  await assertFails(getDocs(query(collection(dbFor('other'), 'files'), where('studentId', '==', 'own'))));
});
test('blocos ficam abaixo do limite por documento e imutáveis depois do envio', async () => {
  const db = dbFor('teacher');
  await assertSucceeds(setDoc(doc(db, 'files/large'), { ...fileData(), size: 196608 }));
  await assertSucceeds(setDoc(doc(db, 'files/large/chunks/0'), { index: 0, data: 'A'.repeat(262144) }));
  await assertFails(setDoc(doc(db, 'files/large/chunks/00'), { index: 0, data: 'AAEC' }));
  await assertFails(setDoc(doc(db, 'files/large/chunks/1'), { index: 1, data: 'AAEC' }));
  await assertFails(updateDoc(doc(db, 'files/large/chunks/0'), { data: 'AAEC' }));
  await assertSucceeds(updateDoc(doc(db, 'files/large'), { status: 'ready', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'files/large'), { name: 'Adulterado', updatedAt: serverTimestamp() }));
});
test('tamanho, tipo, responsável e campos de credenciais de arquivos são validados no servidor', async () => {
  const db = dbFor('teacher');
  for (const data of [
    { ...fileData(), ownerId: 'other' },
    { ...fileData(), studentId: 'other' },
    { ...fileData(), mimeType: 'application/javascript' },
    { ...fileData(), mimeType: 'video/mp4', size: 10485761, chunkCount: 54 },
    { ...fileData(), size: 2097153, chunkCount: 11 },
    { ...fileData(), accessToken: 'segredo' },
  ]) await assertFails(setDoc(doc(db, 'files/invalid'), data));
});
test('exclusão pendente bloqueia uploads e permite remover arquivo e blocos no mesmo lote', async () => {
  const db = dbFor('teacher');
  await assertSucceeds(setDoc(doc(db, 'files/removing'), fileData()));
  await assertSucceeds(setDoc(doc(db, 'files/removing/chunks/0'), { index: 0, data: 'AAEC' }));
  await assertSucceeds(updateDoc(doc(db, 'students/own'), { deleting: true, updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'files/blocked'), fileData()));
  await assertFails(updateDoc(doc(db, 'files/removing'), { status: 'ready', updatedAt: serverTimestamp() }));
  const batch = writeBatch(db);
  batch.delete(doc(db, 'files/removing/chunks/0'));
  batch.delete(doc(db, 'files/removing'));
  await assertSucceeds(batch.commit());
});

function studentProfile(studentId = 'own', email = 'aluno@example.com') {
  return { name: 'Aluno Teste', email, role: 'student', activity: null, active: true, studentId, createdAt: serverTimestamp() };
}
async function linkAccess(db = dbFor('teacher'), uid = 'student-auth', studentId = 'own', extraProfile = {}) {
  const data = { ...studentProfile(studentId), ...extraProfile };
  const batch = writeBatch(db);
  batch.set(doc(db, `profiles/${uid}`), data);
  batch.update(doc(db, `students/${studentId}`), { authUid: uid, email: data.email, updatedAt: serverTimestamp() });
  return batch.commit();
}

test('professor vincula aluno e perfil atomicamente; administrador também libera acesso', async () => {
  await assertSucceeds(linkAccess());
  assert.equal((await getDoc(doc(dbFor('teacher'), 'students/own'))).data().authUid, 'student-auth');
  await assertSucceeds(linkAccess(dbFor('admin'), 'student-other', 'other'));
  await assertFails(linkAccess(dbFor('teacher'), 'outsider', 'other'));
});

test('vínculo isolado, perfil isolado, senha persistida e substituição de conta são bloqueados', async () => {
  const db = dbFor('teacher');
  await assertFails(setDoc(doc(db, 'profiles/student-auth'), studentProfile()));
  await assertFails(updateDoc(doc(db, 'students/own'), { authUid: 'student-auth', email: 'aluno@example.com', updatedAt: serverTimestamp() }));
  await assertFails(linkAccess(db, 'password', 'own', { password: 'nao-salvar' }));
  await assertFails(linkAccess(db, 'wrong-name', 'own', { name: 'Outro nome' }));
  await assertSucceeds(linkAccess());
  await assertFails(linkAccess(db, 'replacement'));
  await assertFails(updateDoc(doc(db, 'students/own'), { authUid: 'other', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'students/own'), { email: 'outro@example.com', updatedAt: serverTimestamp() }));
});

test('aluno lê perfil, próprio cadastro e registros; não lista alunos, equipe ou dados alheios', async () => {
  await assertSucceeds(linkAccess());
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'students/own/records/training'), record()));
  const db = dbFor('student-auth');
  await assertSucceeds(getDoc(doc(db, 'profiles/student-auth')));
  await assertSucceeds(getDoc(doc(db, 'students/own')));
  await assertSucceeds(getDocs(collection(db, 'students/own/records')));
  await assertFails(getDoc(doc(db, 'students/other')));
  await assertFails(getDocs(collection(db, 'students/other/records')));
  await assertFails(getDocs(collection(db, 'students')));
  await assertFails(getDocs(query(collection(db, 'students'), where('authUid', '==', 'student-auth'))));
  await assertFails(getDoc(doc(db, 'profiles/teacher')));
  await assertFails(getDocs(collection(db, 'profiles')));
});

test('aluno não cria, altera, exclui ou promove perfis e conteúdos', async () => {
  await linkAccess(); const db = dbFor('student-auth');
  await assertFails(updateDoc(doc(db, 'profiles/student-auth'), { role: 'admin' }));
  await assertFails(setDoc(doc(db, 'profiles/new'), studentProfile()));
  await assertFails(linkAccess(db, 'new'));
  await assertFails(updateDoc(doc(db, 'students/own'), { deleting: true, updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'students/new'), { ...student('student-auth'), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'students/own/records/forged'), record('student-auth')));
  await assertFails(deleteDoc(doc(db, 'students/own/records/missing')));
  await assertFails(deleteDoc(doc(db, 'students/own')));
});

test('aluno abre somente arquivos prontos do próprio cadastro, sem permissão de escrita ou exclusão', async () => {
  await linkAccess(); const teacherDb = dbFor('teacher'), db = dbFor('student-auth');
  await setDoc(doc(teacherDb, 'files/own-file'), fileData());
  await setDoc(doc(teacherDb, 'files/own-file/chunks/0'), { index: 0, data: 'AAEC' });
  await assertFails(getDoc(doc(db, 'files/own-file')));
  await assertFails(getDoc(doc(db, 'files/own-file/chunks/0')));
  await updateDoc(doc(teacherDb, 'files/own-file'), { status: 'ready', updatedAt: serverTimestamp() });
  await assertSucceeds(getDoc(doc(db, 'files/own-file')));
  await assertSucceeds(getDoc(doc(db, 'files/own-file/chunks/0')));
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'files/other-file'), { ...fileData('other', 'other'), status: 'ready' });
    await setDoc(doc(context.firestore(), 'files/other-file/chunks/0'), { index: 0, data: 'AAEC' });
  });
  await assertFails(getDoc(doc(db, 'files/other-file')));
  await assertFails(getDoc(doc(db, 'files/other-file/chunks/0')));
  await assertFails(setDoc(doc(db, 'files/student-upload'), fileData('student-auth')));
  await assertFails(updateDoc(doc(db, 'files/own-file'), { name: 'Alterado' }));
  await assertFails(deleteDoc(doc(db, 'files/own-file/chunks/0')));
  await assertFails(deleteDoc(doc(db, 'files/own-file')));
});

test('cadastro em exclusão e perfil desativado revogam leitura do aluno e seus arquivos', async () => {
  for (const deactivate of [false, true]) {
    if (deactivate) await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'students/own'), { deleting: false }));
    else await linkAccess();
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'files/revoked'), { ...fileData(), status: 'ready' });
      if (deactivate) await updateDoc(doc(db, 'profiles/student-auth'), { active: false });
      else await updateDoc(doc(db, 'students/own'), { deleting: true });
    });
    const db = dbFor('student-auth');
    await assertFails(getDoc(doc(db, 'students/own')));
    await assertFails(getDocs(collection(db, 'students/own/records')));
    await assertFails(getDoc(doc(db, 'files/revoked')));
  }
});
