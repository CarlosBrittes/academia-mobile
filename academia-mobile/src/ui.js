import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors as c } from './theme';
import useFileAsset from './useFileAsset';

export function Icon({ name, size = 20, color = c.text, ...props }) {
  if (name === 'dumbbell' || name === 'apple-alt') return <FontAwesome5 name={name} solid size={size} color={color} accessible={false} {...props} />;
  return <Feather name={name} size={size} color={color} accessible={false} {...props} />;
}

export function Button({ title, icon, onPress, secondary, disabled, loading, compact, style }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondary, compact && s.compact, style, (pressed || disabled || loading) && s.dim]}>
    {loading ? <ActivityIndicator color={secondary ? c.lime : c.ink} /> : icon && <Icon name={icon} size={18} color={secondary ? c.lime : c.ink} />}
    <Text style={[s.buttonText, secondary && { color: c.text }]}>{title}</Text>
  </Pressable>;
}

export function Field({ label, labelStyle, value, onChangeText, multiline, icon, hint, style, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  return <View style={[s.field, style]}>
    <Text style={[s.label, labelStyle]}>{label}</Text>
    <View style={[s.inputFrame, multiline && { alignItems: 'flex-start' }, focused && { borderColor: c.lime }]}>
      {icon && <Icon name={icon} color={focused ? c.lime : c.muted} size={18} />}
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholderTextColor="#748378" multiline={multiline}
        onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }}
        style={[s.input, multiline && { minHeight: 110, textAlignVertical: 'top' }]} {...props} />
    </View>
    {!!hint && <Text style={s.hint}>{hint}</Text>}
  </View>;
}

export function Badge({ children, color = c.lime }) {
  return <View style={[s.badge, { borderColor: color + '40', backgroundColor: color + '13' }]}><Text style={[s.badgeText, { color }]}>{children}</Text></View>;
}

export function Avatar({ name, photo, large, color = c.lime }) {
  const [failedUri, setFailedUri] = useState(null);
  const { uri } = useFileAsset(photo);
  return <View style={[s.avatar, large && s.largeAvatar, { backgroundColor: color + '16', borderColor: color + '35' }]}>
    {uri && uri !== failedUri ? <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" accessibilityLabel={`Foto de ${name}`} onError={() => setFailedUri(uri)} /> : <Text style={[s.initials, large && { fontSize: 25 }, { color }]}>{name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</Text>}
  </View>;
}

export function Empty({ text, icon = 'users' }) {
  return <View style={s.empty}><View style={s.emptyIcon}><Icon name={icon} size={26} color={c.lime} /></View><Text style={s.emptyTitle}>Um novo começo por aqui</Text><Text style={s.emptyText}>{text}</Text></View>;
}

export function PageTitle({ eyebrow, title, description }) {
  return <View style={s.pageTitle}>{!!eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text style={s.title}>{title}</Text>{!!description && <Text style={s.description}>{description}</Text>}</View>;
}

const s = StyleSheet.create({
  button: { minHeight: 52, paddingVertical: 15, paddingHorizontal: 20, backgroundColor: c.lime, borderRadius: 16, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  secondary: { backgroundColor: c.elevated, borderColor: c.border, borderWidth: 1 }, compact: { minHeight: 44, paddingVertical: 11, paddingHorizontal: 14 },
  buttonText: { fontSize: 14, fontWeight: '700', color: c.ink, flexShrink: 1 }, dim: { opacity: 0.55 },
  field: { marginVertical: 11 }, label: { color: '#d6ded4', fontSize: 12, fontWeight: '600', marginBottom: 9 },
  inputFrame: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#121a15', borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 15 },
  input: { flex: 1, minWidth: 0, paddingVertical: 15, fontSize: 15, color: c.text, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  hint: { color: c.muted, fontSize: 11, lineHeight: 18, marginTop: 7 },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  avatar: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  largeAvatar: { width: 76, height: 76, borderRadius: 25 }, initials: { fontSize: 15, fontWeight: '700' },
  empty: { padding: 30, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: c.border, borderRadius: 22, marginVertical: 20 },
  emptyIcon: { backgroundColor: '#c7f76b12', padding: 15, borderRadius: 19, marginBottom: 16 },
  emptyTitle: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }, emptyText: { color: c.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 350 },
  pageTitle: { marginBottom: 22 }, eyebrow: { color: c.lime, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '800', color: c.text, letterSpacing: -1, lineHeight: 39 }, description: { color: c.muted, fontSize: 13, lineHeight: 21, marginTop: 8 },
});
