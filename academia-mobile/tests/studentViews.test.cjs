const { test } = require('node:test');
const assert = require('node:assert/strict');
const { studentsForCategory, lastModifiedAt, categoryLastModifiedAt } = require('../src/studentViews.cjs');

test('filtros contam alunos uma vez, mesmo com vários registros no histórico', () => {
  const students = [
    { id: 'a', records: [{ category: 'Treino' }, { category: 'Treino' }, { category: 'Nutrição' }] },
    { id: 'b', records: [{ category: 'Nutrição' }] },
    { id: 'c', records: [] },
  ];
  assert.deepEqual(studentsForCategory(students, 'Treino').map(student => student.id), ['a']);
  assert.deepEqual(studentsForCategory(students, 'Nutrição').map(student => student.id), ['a', 'b']);
  assert.equal(studentsForCategory(students, null).length, 3);
  assert.equal(students[0].records.length, 3);
});

test('avaliações incluem apenas alunos com PDF anexado, inclusive no histórico', () => {
  const students = [
    { id: 'sem-pdf', records: [{ category: 'Bioimpedância', attachment: null }] },
    { id: 'com-pdf', records: [{ category: 'Bioimpedância' }, { category: 'Bioimpedância', attachment: { uri: 'blob:pdf' } }] },
    { id: 'outro-anexo', records: [{ category: 'Treino', attachment: { uri: 'blob:video' } }] },
    { id: 'vazio' },
  ];
  assert.deepEqual(studentsForCategory(students, 'Bioimpedância').map(student => student.id), ['com-pdf']);
});

test('última modificação considera a data de gravação e os dados anteriores', () => {
  const student = { createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-11-02T14:30:00.000Z', records: [{ date: '2026-11-01T12:00:00.000Z', performedOn: '2026-12-01' }] };
  assert.equal(lastModifiedAt(student), '2026-11-02T14:30:00.000Z');
  delete student.updatedAt;
  assert.equal(lastModifiedAt(student), '2026-11-01T12:00:00.000Z');
  assert.equal(lastModifiedAt({ createdAt: student.createdAt }), student.createdAt);
});

test('alunos sem datas conhecidas não recebem data fictícia de modificação', () => {
  assert.equal(lastModifiedAt({ records: [{ date: 'inválida' }] }), null);
  assert.equal(lastModifiedAt({}), null);
});

test('cada categoria tem sua data, sem usar a atualização geral do aluno', () => {
  const student = { updatedAt: '2026-11-03T18:00:00.000Z', records: [
    { category: 'Treino', date: '2026-11-01T12:00:00.000Z' },
    { category: 'Nutrição', date: '2026-11-02T12:00:00.000Z' },
    { category: 'Bioimpedância', date: '2026-10-29T12:00:00.000Z' },
  ] };
  assert.equal(categoryLastModifiedAt(student, 'Treino'), '2026-11-01T12:00:00.000Z');
  assert.equal(categoryLastModifiedAt(student, 'Nutrição'), '2026-11-02T12:00:00.000Z');
  assert.equal(categoryLastModifiedAt(student, 'Bioimpedância'), '2026-10-29T12:00:00.000Z');
});

test('categoria usa a modificação mais recente sem confundir a data realizada', () => {
  const student = { records: [
    { category: 'Bioimpedância', date: '2026-10-01T12:00:00.000Z', performedOn: '2026-12-01' },
    { category: 'Bioimpedância', date: '2026-09-01T12:00:00.000Z', updatedAt: '2026-11-03T12:00:00.000Z' },
    { category: 'Treino', date: '2026-11-04T12:00:00.000Z' },
  ] };
  assert.equal(categoryLastModifiedAt(student, 'Bioimpedância'), '2026-11-03T12:00:00.000Z');
});

test('categoria sem registros não herda data de cadastro ou de outro tópico', () => {
  assert.equal(categoryLastModifiedAt({ createdAt: '2026-11-03', records: [{ category: 'Treino', date: '2026-11-03' }] }, 'Nutrição'), null);
  assert.equal(categoryLastModifiedAt({}, 'Treino'), null);
});
