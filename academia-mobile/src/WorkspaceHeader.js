import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Icon } from './ui';
import { colors as c } from './theme';

const activityLabels = {
  'Treinamento personalizado': 'Professor(a)',
  Pilates: 'Professor(a)',
  Personal: 'Personal',
  Nutricionista: 'Nutricionista',
  Fisioterapeuta: 'Fisioterapeuta',
};

export default function WorkspaceHeader({ user, busy, teamActive, onTeam, onPassword, onLogout }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const label = user.role === 'student' ? 'Área do aluno' : user.role === 'admin' ? 'Administrador(a)' : activityLabels[user.activity] || 'Professor(a)';

  function action(name, title, onPress, active = false) {
    return <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [s.action, active && s.activeAction, (pressed || busy) && s.dim]}
    ><Icon name={name} size={18} color={name === 'log-out' ? c.muted : c.lime} /></Pressable>;
  }

  return <View style={s.header}>
    <View style={[s.inner, compact && s.compactInner]}>
      <View style={[s.brand, compact && s.compactBrand]}>
        <Image source={require('../assets/s64-logo.png')} style={[s.logo, compact && s.compactLogo]} accessibilityLabel="Logo Studio 6.4" />
        <View style={s.brandText}>
          <Text style={[s.name, compact && s.compactName]} numberOfLines={1}>Studio 6.4</Text>
          <Text style={s.caption}>{label}</Text>
        </View>
      </View>
      <View style={[s.actions, compact && s.compactActions]}>
        {user.role === 'admin' && action('share-2', 'Sua equipe, conectada', onTeam, teamActive)}
        {action('key', 'Alterar minha senha', onPassword)}
        {action('log-out', 'Sair da conta', onLogout)}
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  header: { backgroundColor: c.background, borderBottomColor: c.border, borderBottomWidth: 1 },
  inner: { width: '100%', maxWidth: 1000, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 20, paddingVertical: 16 },
  compactInner: { paddingHorizontal: 12, gap: 8 },
  brand: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  compactBrand: { gap: 8 },
  logo: { width: 45, height: 45, borderRadius: 14 },
  compactLogo: { width: 36, height: 36, borderRadius: 11 },
  brandText: { flex: 1, minWidth: 0 },
  name: { color: c.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.7 },
  compactName: { fontSize: 18 },
  caption: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 0 },
  compactActions: { gap: 0 },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  activeAction: { backgroundColor: c.elevated },
  dim: { opacity: 0.55 },
});
