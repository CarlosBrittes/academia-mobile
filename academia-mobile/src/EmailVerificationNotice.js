import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui';
import { colors as c } from './theme';

export default function EmailVerificationNotice({ user, busy, onResend, onCheck }) {
  if (user.emailVerified) return null;
  return <View style={s.notice}>
    <Text style={s.title}>Confirme seu endereço de e-mail</Text>
    <Text style={s.body}>Abra o link de confirmação enviado para {user.email}. Confira também a pasta de spam.</Text>
    <View style={s.actions}>
      <Button title="Reenviar confirmação" icon="mail" secondary compact disabled={busy} onPress={onResend} />
      <Button title="Já confirmei" icon="check-circle" secondary compact disabled={busy} onPress={onCheck} />
    </View>
  </View>;
}
const s = StyleSheet.create({
  notice: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginBottom: 20 },
  title: { color: c.text, fontSize: 14, fontWeight: '700' },
  body: { color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 7 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
