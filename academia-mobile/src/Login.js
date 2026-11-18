import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Field } from './ui';
import { colors as c } from './theme';
const { PASSWORD_HINT } = require('./account-contract.cjs');
export default function Login({ mode = 'login', email, password, confirmation, currentPassword, setCurrentPassword, setEmail, setPassword, setConfirmation, busy, login, error, notice, onForgot, onBack }) {
  const changing = mode === 'changePassword';
  const recovering = mode === 'forgotPassword';
  return <LinearGradient colors={['#101b16', '#102a23', '#101612']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <View style={s.layout}>
        <View style={s.brand}><Image source={require('../assets/s64-logo.png')} style={s.logo} accessibilityLabel="Logo Studio 6.4" /><Text style={s.brandName}>Studio 6.4</Text></View>
        <View style={s.card}>
          <Text style={s.cardTitle}>{changing ? 'Alterar minha senha' : recovering ? 'Recupere seu acesso' : 'Seu acompanhamento começa aqui'}</Text>
          <Text style={s.description}>{changing ? `Atualize a senha do acesso ${email}.` : recovering ? 'Informe o e-mail cadastrado para receber um link de redefinição de senha.' : 'Alunos e equipe: entre com seu e-mail e senha.'}</Text>
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
          {!!notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
          <View style={{ marginTop: 19 }}>
            {!changing && <Field label="E-mail" icon="mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="seu@email.com" editable={!busy} maxLength={254} onSubmitEditing={recovering ? login : undefined} />}
            {changing && <Field label="Senha atual" icon="lock" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" editable={!busy} maxLength={128} />}
            {!recovering && <Field label={changing ? 'Nova senha' : 'Senha'} icon="lock" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={changing ? 'new-password' : 'current-password'} placeholder={changing ? 'Crie sua nova senha' : 'Sua senha'} hint={changing ? PASSWORD_HINT : undefined} maxLength={128} editable={!busy} onSubmitEditing={changing ? undefined : login} />}
            {changing && <Field label="Confirmar nova senha" icon="lock" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" placeholder="Digite novamente" maxLength={128} editable={!busy} onSubmitEditing={login} />}
            <Button title={changing ? 'Salvar nova senha' : recovering ? 'Enviar link de recuperação' : 'Entrar'} loading={busy} onPress={login} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={mode === 'login' ? onForgot : onBack} style={s.link}><Text style={s.linkText}>{mode === 'login' ? 'Esqueci minha senha' : changing ? 'Voltar ao início' : 'Voltar ao login'}</Text></Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  </LinearGradient>;
}
const s = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', padding: 24 }, layout: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 30 }, brand: { alignItems: 'center', gap: 14 }, logo: { width: 96, height: 96, borderRadius: 28 }, brandName: { color: c.text, fontSize: 36, fontWeight: '800', letterSpacing: -1 }, card: { backgroundColor: '#1b261f', borderWidth: 1, borderColor: '#384b3a', padding: 26, borderRadius: 28 }, cardTitle: { color: c.text, fontSize: 24, fontWeight: '700', lineHeight: 31, letterSpacing: -0.5, textAlign: 'center' }, error: { color: c.danger, backgroundColor: '#3b2522', padding: 12, borderRadius: 10, marginTop: 14, fontSize: 12, lineHeight: 18 }, notice: { color: '#d1efba', backgroundColor: '#243725', padding: 12, borderRadius: 10, marginTop: 14, fontSize: 12, lineHeight: 18 }, description: { color: c.muted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 14 }, link: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 10 }, linkText: { color: c.lime, fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
