export const colors = {
  background: '#101612',
  surface: '#1a221d',
  elevated: '#222d25',
  border: '#303d33',
  text: '#f5f7ef',
  muted: '#a4b0a6',
  lime: '#c7f76b',
  green: '#48d6a1',
  teal: '#07596b',
  ink: '#17200f',
  danger: '#ffac9d',
};

export const dateLabel = value => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value.split('-').reverse().join('/');
  return new Date(value).toLocaleDateString('pt-BR');
};

export const todayInput = () => {
  const now = new Date();
  return [now.getDate(), now.getMonth() + 1, now.getFullYear()].map((part, index) => index < 2 ? String(part).padStart(2, '0') : String(part)).join('/');
};

export const categoryMeta = {
  Treino: { icon: 'dumbbell', color: colors.lime },
  Nutrição: { icon: 'apple-alt', color: colors.green },
  Bioimpedância: { icon: 'file-text', color: '#9dde88' },
};

export const formHeading = { fontSize: 16, fontWeight: '700', color: colors.text };

export const categoryLabels = { Treino: 'Treinos', Nutrição: 'Planos alimentares', Bioimpedância: 'Avaliações' };
