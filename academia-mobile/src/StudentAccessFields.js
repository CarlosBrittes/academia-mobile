import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Field, Icon } from './ui';
import { colors as c } from './theme';
const { PASSWORD_HINT } = require('./account-contract.cjs');

export default function StudentAccessFields({ email, password, confirmation, onEmail, onPassword, onConfirmation, busy }) {
  return <View style={s.section}>
    <View style={s.heading}><Icon name="smartphone" color={c.lime} size={20} /><Text style={s.title}>Acesso do aluno ao app</Text></View>
    <Text style={s.description}>O aluno entrará com este e-mail para consultar seus treinos, vídeos e dietas. Compartilhe a senha inicial diretamente com ele.</Text>
    <Field label="E-mail do aluno" icon="mail" value={email} onChangeText={onEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="off" maxLength={254} editable={!busy} placeholder="aluno@email.com" hint="Use um e-mail pessoal do aluno, diferente do acesso do professor." />
    <Field label="Senha inicial do aluno" icon="lock" value={password} onChangeText={onPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" maxLength={128} editable={!busy} hint={PASSWORD_HINT} />
    <Field label="Confirmar senha do aluno" icon="lock" value={confirmation} onChangeText={onConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" maxLength={128} editable={!busy} />
    <Text style={s.description}>Ele poderá alterar a senha no app ou usar “Esqueci minha senha” na tela de entrada.</Text>
  </View>;
}

const s = StyleSheet.create({
  section: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 20, marginTop: 18 },
  heading: { flexDirection: 'row', gap: 10, alignItems: 'center' }, title: { color: c.text, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  description: { color: c.muted, fontSize: 12, lineHeight: 20, marginTop: 9 },
});
