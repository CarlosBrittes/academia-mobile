const { test } = require('node:test');
const assert = require('node:assert/strict');
const { phoneBR, whatsappURL, studentWelcomeURL, validateStudent, validatePhoto, validateAssessment, validatePdf, formatTimeInput, formatDateInput } = require('../src/domain.cjs');
test('WhatsApp codifica acentos e não inclui dados de saúde', () => {
  const url = new URL(whatsappURL({ name: 'João & Ana', phone: '11999999999' }, 'Treino'));
  assert.equal(url.hostname, 'wa.me');
  assert.match(url.searchParams.get('text'), /João & Ana/);
  assert.doesNotMatch(url.searchParams.get('text'), /64 kg/);
});

test('boas-vindas usa WhatsApp do aluno e o texto com login, senha inicial e orientação de troca', () => {
  const student = { name: 'Ana', phone: '(21) 97154-0551' };
  const url = new URL(studentWelcomeURL(student, ' Ana@Example.com ', 'Senha inicial 123'));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/5521971540551');
  assert.equal(url.searchParams.get('text'), 'Seu cadastro no app do Studio foi registrado com sucesso, segue abaixo seu login:\nemail: ana@example.com\nsenha: Senha inicial 123\n\nApós entrar, você pode alterar sua senha pelo ícone de chave no app.');
  assert.deepEqual(student, { name: 'Ana', phone: '(21) 97154-0551' });
});

test('mensagem de acesso preserva senha exata e codifica caracteres especiais sem criar parâmetros', () => {
  const password = '  Senha & + # ? = % ç 🔑  ';
  const url = new URL(studentWelcomeURL({ phone: '+55 (11) 99999-9999' }, 'ana+studio@example.com', password));
  assert.deepEqual([...url.searchParams.keys()], ['text']);
  assert.equal(url.hash, '');
  assert.ok(url.searchParams.get('text').includes(`email: ana+studio@example.com\nsenha: ${password}\n\n`));
});

test('mensagem de acesso exige telefone e credenciais válidos', () => {
  assert.throws(() => studentWelcomeURL({ phone: '123' }, 'ana@example.com', 'Senha inicial 123'), /DDD/);
  assert.throws(() => studentWelcomeURL({ phone: '11999999999' }, '', 'Senha inicial 123'), /e-mail/);
  assert.throws(() => studentWelcomeURL({ phone: '11999999999' }, 'ana@example.com', ''), /10 a 128/);
});
const pdf = { uri: 'file:///avaliacao.pdf', name: 'Avaliação.pdf', mimeType: 'application/pdf', size: 1024 };

test('bioimpedância salva data realizada e PDF sem exigir medidas', () => {
  assert.deepEqual(validateAssessment('02/11/2026', pdf), { performedOn: '2026-11-02', attachment: pdf });
  assert.equal(validateAssessment('29/02/2024', pdf).performedOn, '2024-02-29');
});

test('avaliação recusa datas incompletas ou inexistentes e exige PDF', () => {
  for (const date of ['', '02/11/', '31/02/2026', '29/02/2025', '00/12/2026', '01/13/2026']) assert.throws(() => validateAssessment(date, pdf), /data/);
  assert.throws(() => validateAssessment('02/11/2026', null), /PDF/);
});

test('anexo recusa outros formatos e PDFs maiores que o limite', () => {
  assert.throws(() => validatePdf({ ...pdf, name: 'foto.jpg', mimeType: 'image/jpeg' }), /PDF/);
  assert.throws(() => validatePdf({ ...pdf, mimeType: 'image/png' }), /PDF/);
  assert.throws(() => validatePdf({ ...pdf, size: 5 * 1024 * 1024 + 1 }), /5 MB/);
  assert.equal(validatePdf({ ...pdf, mimeType: '', size: 5 * 1024 * 1024 }).mimeType, 'application/pdf');
});

test('horário insere dois-pontos durante digitação e permite apagar', () => {
  let value = '';
  for (const digit of '0730') value = formatTimeInput(value + digit, value);
  assert.equal(value, '07:30');
  assert.equal(formatTimeInput('07'), '07:');
  assert.equal(formatTimeInput('07', '07:'), '0');
  assert.equal(formatTimeInput('07:30'), '07:30');
  assert.equal(formatTimeInput('abc'), '');
});

test('data insere barras durante digitação e permite apagar', () => {
  let value = '';
  for (const digit of '02112026') value = formatDateInput(value + digit, value);
  assert.equal(value, '02/11/2026');
  assert.equal(formatDateInput('02/11', '02/11/'), '02/1');
});

test('mensagem de nutrição usa o texto solicitado e preserva o nome', () => {
  const url = new URL(whatsappURL({ name: 'João & Ana', phone: '11999999999' }, 'Nutrição'));
  assert.equal(url.searchParams.get('text'), 'Olá, João & Ana Seu plano alimentar foi atualizado. Entre em contato com a equipe caso tenha qualquer dúvida!');
});
test('os três formatos solicitados apontam para o mesmo WhatsApp', () => {
  for (const phone of ['21 971540551', '21971540551', '(21) 97154-0551', '+55 (21) 97154-0551']) {
    assert.equal(phoneBR(phone), '5521971540551');
    const url = new URL(whatsappURL({ name:'Carlos', phone }, 'Treino'));
    assert.equal(url.pathname, '/5521971540551');
    assert.equal(url.searchParams.get('text'), 'Olá, Carlos seu treino foi atualizado! Te aguardo na próxima aula :)');
  }
});
const { validateExercises, validateMeals } = require('../src/domain.cjs');
test('treino exige exercício, séries válidas e repetições', () => {
  const e={name:'Agachamento',sets:'3',reps:'12'};
  assert.doesNotThrow(()=>validateExercises([e]));
  assert.throws(()=>validateExercises([]));
  for(const sets of ['0','-1','abc','100','1.5']) assert.throws(()=>validateExercises([{...e,sets}]));
});
test('refeições exigem alimentos e validam horário opcional', () => {
  const m={name:'Almoço',food:'Plano orientado',time:'12:30'};
  assert.doesNotThrow(()=>validateMeals([m]));
  assert.throws(()=>validateMeals([{...m,time:'25:99'}]));
  assert.throws(()=>validateMeals([{...m,food:''}]));
});

test('cadastro aceita aluno sem foto e preserva a foto quando escolhida', () => {
  const student = { name: 'Aluno Teste', phone: '11999999999', goal: 'Força' };
  assert.equal(validateStudent(student).photo, null);
  assert.equal(validateStudent({ ...student, photo: { uri: 'file:///aluno.jpg', mimeType: 'image/jpeg' } }).photo.uri, 'file:///aluno.jpg');
});

test('foto guarda apenas metadados, sem arquivos brutos ou EXIF', () => {
  const asset = { uri: 'blob:foto', fileName: 'aluno.png', mimeType: 'image/png', fileSize: 2048, width: 300, height: 300, type: 'image', exif: { local: 'teste' }, base64: 'conteúdo', file: {} };
  assert.deepEqual(validatePhoto(asset), { uri: 'blob:foto', name: 'aluno.png', mimeType: 'image/png', size: 2048, width: 300, height: 300 });
  assert.deepEqual(validatePhoto(validatePhoto(asset)), validatePhoto(asset));
});

test('foto recusa outros arquivos, imagens ilegíveis e tamanho excessivo', () => {
  const image = { uri: 'blob:foto', mimeType: 'image/jpeg', width: 300, height: 300 };
  assert.throws(() => validatePhoto({ ...image, mimeType: 'application/pdf' }), /foto válido/);
  assert.throws(() => validatePhoto({ ...image, type: 'video' }), /foto válido/);
  assert.throws(() => validatePhoto({ ...image, width: 0 }), /ler a foto/);
  assert.throws(() => validatePhoto({ ...image, fileSize: 2 * 1024 * 1024 + 1 }), /2 MB/);
  assert.throws(() => validatePhoto({ ...image, uri: '' }), /foto válido/);
  assert.doesNotThrow(() => validatePhoto({ ...image, fileSize: 2 * 1024 * 1024 }));
});
