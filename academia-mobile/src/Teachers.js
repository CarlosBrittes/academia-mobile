import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Button, Empty, Field, Icon, PageTitle } from './ui';
import { colors as c } from './theme';
const { ACTIVITIES, PASSWORD_HINT, validateMember, validatePassword } = require('./account-contract.cjs');
export default function Teachers({ teachers, busy, onCreate }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('teacher');
  const [activity, setActivity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  async function submit() {
    setError('');
    let input;
    try {
      input = validateMember({ name, role, activity, email });
      validatePassword(password, confirmation);
    } catch (problem) { setError(problem.message); return; }
    if (await onCreate({ ...input, password, confirmation })) {
      setName(''); setActivity(''); setEmail(''); setPassword(''); setConfirmation('');
    }
  }
  function option(value, selected, action, label) {
    return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled: busy }} disabled={busy} onPress={action} style={[s.option, selected && s.selected]}><Icon name={selected ? 'check-circle' : 'circle'} size={17} color={selected ? c.lime : c.muted} /><Text style={[s.optionText, selected && { color: c.lime }]}>{label}</Text></Pressable>;
  }
  return <>
    <PageTitle eyebrow="GENTE QUE TRANSFORMA" title="Sua equipe" description="Cadastre os professores e administradores do Studio." />
    <View style={s.form}>
      <Text style={s.label}>Perfil de acesso</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Perfil de acesso" style={s.options}>{option('teacher', role === 'teacher', () => setRole('teacher'), 'Professor')}{option('admin', role === 'admin', () => setRole('admin'), 'Administrador')}</View>
      <Field label="Nome completo" value={name} onChangeText={setName} icon="user" placeholder="Nome do profissional" autoCapitalize="words" maxLength={120} editable={!busy} />
      {role === 'teacher' && <><Text style={s.label}>Atividade</Text><View accessibilityRole="radiogroup" accessibilityLabel="Atividade do professor" style={s.options}>{ACTIVITIES.map(item => option(item, activity === item, () => setActivity(item), item))}</View></>}
      <Field label="E-mail de acesso" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" icon="mail" placeholder="profissional@email.com" maxLength={254} editable={!busy} />
      <Field label="Senha inicial" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" icon="lock" hint={PASSWORD_HINT} maxLength={128} editable={!busy} />
      <Field label="Confirmar senha inicial" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" icon="lock" maxLength={128} editable={!busy} />
      <Text style={s.info}>Ao concluir o cadastro, o Firebase enviará um e-mail de confirmação de endereço. Compartilhe a senha inicial diretamente com o profissional; ela não será enviada por e-mail.</Text>
      {role === 'admin' && <Text style={s.info}>Administradores podem cadastrar a equipe e acessar todos os alunos do Studio.</Text>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Button title="Cadastrar acesso" icon="user-plus" loading={busy} onPress={submit} />
    </View>
    <Text style={s.heading}>Equipe cadastrada · {teachers.length}</Text>
    {!teachers.length && !busy && <Empty text="Os profissionais cadastrados aparecerão aqui." />}
    {teachers.map(member => <View style={s.teacher} key={member.id}><View style={s.teacherTop}><Avatar name={member.name} /><View style={{ flex: 1 }}><Text style={s.name}>{member.name}</Text><Text style={s.detail}>{member.email}</Text>{!!member.activity && <Text style={s.activity}>{member.activity}</Text>}</View></View><View style={s.status}><Badge>{member.role === 'admin' ? 'ADMINISTRADOR' : 'PROFESSOR'}</Badge><Text style={s.detail}>{member.active ? 'Acesso ativo' : 'Acesso desativado'}</Text></View></View>)}
  </>;
}
const s = StyleSheet.create({
  form: { padding: 21, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border }, label: { color: '#d6ded4', fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, option: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: '#121a15' }, selected: { borderColor: c.lime, backgroundColor: '#c7f76b0d' }, optionText: { color: c.text, fontSize: 12, flexShrink: 1 },
  info: { color: c.muted, fontSize: 12, lineHeight: 20, marginVertical: 10 }, heading: { color: c.text, fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 17 }, teacher: { padding: 18, borderRadius: 18, backgroundColor: c.surface, marginBottom: 12, borderWidth: 1, borderColor: c.border }, teacherTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { color: c.text, fontSize: 17, fontWeight: '700' }, detail: { color: c.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }, activity: { color: c.lime, fontSize: 12, marginTop: 5 }, status: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }, error: { color: c.danger, fontSize: 12, lineHeight: 20, marginVertical: 10 },
});
