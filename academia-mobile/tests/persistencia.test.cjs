// Testes da camada de persistência com o repositório real e armazenamento simulado.
// O adaptador em memória substitui o Firestore; estes casos não acessam o banco real.
// Executar: node --test tests/persistencia.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRepository } = require('../src/repository.cjs');
const { memoryStore } = require('./helpers/memory-store.cjs');

const teacher = { id: 't1', name: 'Marina', role: 'teacher', active: true };
const student = { id: 'a', name: 'Ana Oliveira', phone: '(11) 99999-9999', goal: 'Fortalecimento' };
const training = {
  id: 'r1', category: 'Treino', title: 'Treino A',
  exercises: [{ id: 'e1', name: 'Agachamento', sets: '3', reps: '12', video: null }],
};

// Exemplo 1: outra instância do repositório deve recuperar os dados já salvos.
test('novo repositório conserva alunos e acompanhamentos no mesmo armazenamento', async () => {
  const store = memoryStore();
  const repo = createRepository(store);
  await repo.save(teacher, student);
  await repo.addRecord(teacher, student.id, training);

  const reopened = createRepository(store);
  const [saved] = await reopened.list(teacher);

  assert.equal(saved.name, student.name);
  assert.equal(saved.phone, '5511999999999');
  assert.equal(saved.records[0].title, training.title);
});

// Exemplo 2: novas atualizações preservam o histórico e não aceitam autoria forjada.
test('histórico não é sobrescrito e a autoria/data vêm da sessão e armazenamento', async () => {
  const store = memoryStore();
  const repo = createRepository(store);
  const original = await repo.save(teacher, student);
  await repo.addRecord(teacher, student.id, {
    ...training, author: 'forjado', authorId: 'outro', date: '2000-01-01',
  });
  const updated = await repo.addRecord(teacher, student.id, { ...training, id: 'r2' });

  assert.deepEqual(updated.records.map(record => record.id), ['r2', 'r1']);
  assert.equal(updated.records[0].author, teacher.name);
  assert.equal(updated.records[0].authorId, teacher.id);
  assert.equal(updated.createdAt, original.createdAt);
  assert.equal(updated.updatedAt, updated.records[0].updatedAt);
  assert.notEqual(updated.records[0].date, '2000-01-01');
  await assert.rejects(repo.addRecord(teacher, student.id, training), /já foi salvo/);
});
