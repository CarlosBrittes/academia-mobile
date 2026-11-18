const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRepository } = require('../src/repository.cjs');
const { memoryStore } = require('./helpers/memory-store.cjs');
const teacher = { id: 't1', name: 'Marina', role: 'teacher', active: true }, other = { id: 't2', name: 'Outro', role: 'teacher', active: true }, admin = { id: 'admin', name: 'Admin', role: 'admin', active: true };
const student = { id: 'a', name: 'Ana Oliveira', phone: '(11) 99999-9999', goal: 'Fortalecimento' };
const exercise = { id: 'e1', name: 'Agachamento', sets: '3', reps: '12', video: null };
const training = { id: 'r1', category: 'Treino', title: 'Treino A', exercises: [exercise] };
test('professor não acessa nem altera aluno de outro professor; admin consulta todos', async () => {
  const repo = createRepository(memoryStore()); await repo.save(teacher, student);
  assert.deepEqual(await repo.list(other), []);
  await assert.rejects(repo.addRecord(other, 'a', training), /acesso/);
  await assert.rejects(repo.remove(other, 'a'), /acesso/);
  assert.equal((await repo.list(admin)).length, 1);
});
test('cadastro limpa campos extras e impede substituição de alunos', async () => {
  const store = memoryStore(), repo = createRepository(store);
  await repo.save(teacher, { ...student, teacherId: 'forjado', password: 'nao-salvar' });
  assert.equal(store.students.get('a').teacherId, teacher.id);
  assert.equal(store.students.get('a').password, undefined);
  await assert.rejects(repo.save(teacher, student), /já existe/);
});
test('PDF e data persistem como informações; blob é local e não vai para Firestore', async () => {
  const store = memoryStore(), repo = createRepository(store); await repo.save(teacher, student);
  const input = { id: 'pdf1', category: 'Bioimpedância', title: 'Avaliação inicial', performedOn: '2026-11-04', attachment: { uri: 'blob:privado', name: 'avaliacao.pdf', mimeType: 'application/pdf', size: 1024 } };
  const saved = await repo.addRecord(teacher, 'a', input);
  assert.equal(saved.records[0].attachment.uri, 'blob:privado');
  assert.equal(JSON.stringify([...store.records.get('a').values()]).includes('blob:privado'), false);
  const [reopened] = await createRepository(store).list(teacher);
  assert.equal(reopened.records[0].attachment.name, 'avaliacao.pdf');
  assert.equal(reopened.records[0].attachment.uri, null);
  assert.equal(reopened.records[0].performedOn, '2026-11-04');
  assert.equal(require('../src/studentViews.cjs').studentsForCategory([reopened], 'Bioimpedância').length, 1);
});
test('fotos e vídeos não gravam arquivos, caminhos locais ou conteúdo base64 no banco', async () => {
  const store = memoryStore(), repo = createRepository(store);
  await repo.save(teacher, { ...student, photo: { uri: 'data:image/png;base64,abc', name: 'foto.png', mimeType: 'image/png', size: 100 } });
  await repo.addRecord(teacher, 'a', { ...training, exercises: [{ ...exercise, video: { uri: 'file:///privado.mp4', name: 'video.mp4', mimeType: 'video/mp4', size: 500 } }] });
  assert.equal(JSON.stringify(store.students.get('a')).includes('base64'), false);
  assert.equal(JSON.stringify([...store.records.get('a').values()]).includes('file:///'), false);
  const [reopened] = await createRepository(store).list(teacher);
  assert.equal(reopened.photo.uri, null); assert.equal(reopened.records[0].exercises[0].video.uri, null);
});
test('remoção limpa o histórico e pode ser retomada após falha de rede', async () => {
  const store = memoryStore(), repo = createRepository(store); await repo.save(teacher, student); await repo.addRecord(teacher, 'a', training);
  store.failDelete = true; await assert.rejects(repo.remove(teacher, 'a'), /rede/);
  assert.equal(store.students.get('a').deleting, true);
  await assert.rejects(repo.addRecord(teacher, 'a', { ...training, id: 'r2' }), /exclusão/);
  store.failDelete = false; await repo.remove(teacher, 'a');
  assert.deepEqual(await repo.list(teacher), []); assert.equal(store.records.has('a'), false);
});
test('entrada inválida ou sessão ausente não grava dados', async () => {
  const store = memoryStore(), repo = createRepository(store);
  await assert.rejects(repo.save(null, student), /Entre/);
  await assert.rejects(repo.save(teacher, { ...student, id: '../outro' }), /Identificador/);
  await assert.rejects(repo.save(teacher, { ...student, phone: '123' }), /telefone/);
  assert.equal(store.students.size, 0);
});

test('aluno consulta apenas seu cadastro com treinos, vídeos e dietas em leitura', async () => {
  const store = memoryStore(), repo = createRepository(store);
  await repo.save(teacher, student);
  await repo.addRecord(teacher, 'a', training);
  await repo.addRecord(teacher, 'a', { id: 'diet', category: 'Nutrição', title: 'Dieta A', meals: [{ id: 'meal', name: 'Almoço', food: 'Arroz e feijão', time: '12:30' }] });
  store.students.get('a').authUid = 'student-auth';
  const session = { id: 'student-auth', studentId: 'a', role: 'student', active: true };
  const own = await repo.getOwn(session);
  assert.equal(own.name, student.name); assert.deepEqual(own.records.map(item => item.title), ['Dieta A', 'Treino A']);
  for (const action of [() => repo.list(session), () => repo.save(session, student), () => repo.addRecord(session, 'a', training), () => repo.remove(session, 'a')]) await assert.rejects(action(), /Entre/);
  for (const invalid of [{ ...session, id: 'outro' }, { ...session, studentId: 'b' }, { ...session, active: false }, teacher]) await assert.rejects(repo.getOwn(invalid));
  store.students.get('a').deleting = true;
  await assert.rejects(repo.getOwn(session), /indisponível/);
});
