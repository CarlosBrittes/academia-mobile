const { FILE_LIMITS } = require('./file-contract.cjs');
const { validateStudentAccess } = require('./account-contract.cjs');
function phoneBR(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
  if (!/^55[1-9][0-9][0-9]{8,9}$/.test(digits)) throw new Error('Informe um telefone brasileiro com DDD.');
  return digits;
}
function whatsappURL(student, category) {
  const message = category === 'Treino'
    ? `Olá, ${student.name} seu treino foi atualizado! Te aguardo na próxima aula :)`
    : category === 'Nutrição'
      ? `Olá, ${student.name} Seu plano alimentar foi atualizado. Entre em contato com a equipe caso tenha qualquer dúvida!`
      : `Olá, ${student.name}! Sua avaliação de bioimpedância foi atualizada. Entre em contato com a equipe para conferir as novidades!`;
  return `https://wa.me/${phoneBR(student.phone)}?text=${encodeURIComponent(message)}`;
}
function studentWelcomeURL(student, emailInput, password) {
  const { email } = validateStudentAccess({ email: emailInput, password, confirmation: password });
  const message = `Seu cadastro no app do Studio foi registrado com sucesso, segue abaixo seu login:\nemail: ${email}\nsenha: ${password}\n\nApós entrar, você pode alterar sua senha pelo ícone de chave no app.`;
  return `https://wa.me/${phoneBR(student.phone)}?text=${encodeURIComponent(message)}`;
}
function validateExercises(exercises) {
  if (!exercises.length) throw new Error('Adicione pelo menos um exercício.');
  for (const e of exercises) {
    if (!e.name.trim() || !/^\d+$/.test(e.sets) || Number(e.sets) < 1 || Number(e.sets) > 50 || !e.reps.trim()) throw new Error('Preencha exercício, séries (1 a 50) e repetições.');
  }
}
function validateMeals(meals) {
  if (!meals.length) throw new Error('Adicione pelo menos uma refeição.');
  for (const m of meals) {
    if (!m.name.trim() || !m.food.trim()) throw new Error('Preencha o nome e os alimentos de cada refeição.');
    if (m.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time)) throw new Error('Use o horário no formato HH:MM, por exemplo 07:30.');
  }
}
function validateStudent(input) {
  const name = String(input.name || '').trim();
  if (name.length < 3) throw new Error('Informe o nome completo do aluno.');
  return { name, phone: phoneBR(input.phone), goal: String(input.goal || '').trim(), photo: validatePhoto(input.photo) };
}
function validatePhoto(asset) {
  if (asset == null) return null;
  const mimeType = asset.mimeType || null;
  if (typeof asset.uri !== 'string' || !asset.uri.trim() || (asset.type && asset.type !== 'image') || (mimeType && (!mimeType.startsWith('image/') || mimeType === 'image/svg+xml'))) {
    throw new Error('Escolha um arquivo de foto válido.');
  }
  const size = asset.fileSize ?? asset.size ?? null;
  if (size != null && (!Number.isFinite(size) || size < 0 || size > FILE_LIMITS.photo)) throw new Error('Escolha uma foto de até 2 MB.');
  for (const dimension of [asset.width, asset.height]) {
    if (dimension != null && (!Number.isFinite(dimension) || dimension <= 0)) throw new Error('Não foi possível ler a foto. Escolha outra imagem.');
  }
  return { uri: asset.uri, name: asset.fileName || asset.name || 'Foto do aluno', mimeType, size, width: asset.width ?? null, height: asset.height ?? null };
}
function maskDigits(value, previous, separator, groups) {
  let digits = String(value || '').replace(/\D/g, '').slice(0, groups.reduce((total, group) => total + group, 0));
  // Permite apagar o separador automático com Backspace sem ficar preso nele.
  if (previous.endsWith(separator) && value === previous.slice(0, -1)) digits = digits.slice(0, -1);
  let formatted = '', offset = 0;
  for (let i = 0; i < groups.length && offset < digits.length; i++) {
    const part = digits.slice(offset, offset + groups[i]);
    formatted += part;
    offset += groups[i];
    if (part.length === groups[i] && i < groups.length - 1) formatted += separator;
  }
  return formatted;
}
function formatTimeInput(value, previous = '') { return maskDigits(value, previous, ':', [2, 2]); }
function formatDateInput(value, previous = '') { return maskDigits(value, previous, '/', [2, 2, 4]); }
function validatePdf(asset) {
  if (!asset?.uri || !/\.pdf$/i.test(asset.name || '') || (asset.mimeType && !['application/pdf', 'application/octet-stream'].includes(asset.mimeType))) {
    throw new Error('Anexe a avaliação em um arquivo PDF.');
  }
  if (asset.size != null && (!Number.isFinite(asset.size) || asset.size < 0 || asset.size > FILE_LIMITS.pdf)) {
    throw new Error('Escolha um PDF de até 5 MB.');
  }
  return { uri: asset.uri, name: asset.name, mimeType: 'application/pdf', size: asset.size ?? null };
}
function validateAssessment(date, attachment) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(date || '').trim());
  if (!match) throw new Error('Informe a data realizada no formato DD/MM/AAAA.');
  const [, day, month, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number(year) < 1900 || parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() !== Number(month) - 1 || parsed.getUTCDate() !== Number(day)) {
    throw new Error('Informe uma data de avaliação válida.');
  }
  return { performedOn: `${year}-${month}-${day}`, attachment: validatePdf(attachment) };
}
module.exports = { phoneBR, whatsappURL, studentWelcomeURL, validateStudent, validatePhoto, validateExercises, validateMeals, formatTimeInput, formatDateInput, validatePdf, validateAssessment };
