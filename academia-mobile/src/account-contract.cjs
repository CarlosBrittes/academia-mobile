const ACTIVITIES = Object.freeze(['Personal', 'Treinamento personalizado', 'Pilates', 'Nutricionista', 'Fisioterapeuta']);
const PASSWORD_HINT = 'Use de 10 a 128 caracteres.';
const RESET_MESSAGE = 'Se houver uma conta cadastrada com este e-mail, o Firebase enviará um link para redefinir sua senha. Confira também a pasta de spam.';
function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email)) throw new Error('Informe um e-mail válido.');
  return email;
}
function validatePassword(password, confirmation) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128 || !password.trim()) throw new Error(PASSWORD_HINT);
  if (password !== confirmation) throw new Error('A confirmação da senha não confere.');
  return password;
}
function validateMember(input = {}) {
  const name = String(input.name || '').trim();
  if (name.length < 3 || name.length > 120) throw new Error('Informe um nome com 3 a 120 caracteres.');
  if (!['teacher', 'admin'].includes(input.role)) throw new Error('Selecione o perfil de acesso.');
  if (input.role === 'teacher' && !ACTIVITIES.includes(input.activity)) throw new Error('Selecione a atividade do professor.');
  return { name, email: normalizeEmail(input.email), role: input.role, activity: input.role === 'teacher' ? input.activity : null };
}
function validateStudentAccess(input = {}) {
  const email = normalizeEmail(input.email);
  validatePassword(input.password, input.confirmation);
  return { email };
}
module.exports = { ACTIVITIES, PASSWORD_HINT, RESET_MESSAGE, normalizeEmail, validatePassword, validateMember, validateStudentAccess };
