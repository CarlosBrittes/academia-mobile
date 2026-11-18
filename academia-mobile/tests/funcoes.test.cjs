// Testes unitários de funções: um dos tipos de teste citados no enunciado.
// Executar: node --test tests/funcoes.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { phoneBR, validateStudent } = require('../src/domain.cjs');

// Exemplo 1: entradas válidas devem gerar o mesmo número para o WhatsApp.
test('normaliza telefone local e internacional sem duplicar DDI', () => {
  assert.equal(phoneBR('(11) 99999-9999'), '5511999999999');
  assert.equal(phoneBR('+55 11 99999-9999'), '5511999999999');
});

// Exemplo 2: entradas inválidas devem ser rejeitadas antes de salvar o aluno.
test('recusa telefone incompleto e cadastro sem nome', () => {
  assert.throws(() => phoneBR('123'), /DDD/);
  assert.throws(() => validateStudent({ name: 'A', phone: '11999999999' }), /nome/);
});
