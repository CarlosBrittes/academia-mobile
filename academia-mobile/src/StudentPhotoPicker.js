import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Avatar, Button } from './ui';
import { colors as c } from './theme';
const { validatePhoto } = require('./domain.cjs');

export default function StudentPhotoPicker({ name, photo, onChange, onPickingChange, disabled }) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; onPickingChange(false); };
  }, [onPickingChange]);

  async function pick() {
    if (picking || disabled) return;
    setPicking(true); setError(''); onPickingChange(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, allowsMultipleSelection: false });
      if (mounted.current && !result.canceled) onChange(validatePhoto(result.assets[0]));
    } catch (e) {
      if (mounted.current) setError(e.message || 'Não foi possível selecionar a foto. Tente novamente.');
    } finally {
      if (mounted.current) { setPicking(false); onPickingChange(false); }
    }
  }

  return <View style={s.section}>
    <Text style={s.label}>Foto do aluno (opcional)</Text>
    <View style={s.row}><Avatar name={name.trim() || 'Aluno'} photo={photo} large /><View style={s.actions}>
      <Button title={photo ? 'Trocar foto' : 'Adicionar foto'} icon="image" secondary compact onPress={pick} loading={picking} disabled={disabled} />
      {!!photo && <Button title="Remover foto" icon="trash-2" secondary compact disabled={disabled || picking} onPress={() => { onChange(null); setError(''); }} />}
    </View></View>
    <Text style={s.hint}>Foto da galeria · até 2 MB · a imagem e os dados do aluno serão salvos no Firebase.</Text>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}

const s = StyleSheet.create({
  section: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 10 },
  label: { color: c.text, fontSize: 13, fontWeight: '600', marginBottom: 13 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 }, actions: { flex: 1, minWidth: 135 },
  hint: { color: c.muted, fontSize: 10, marginTop: 9 }, error: { color: c.danger, fontSize: 12, lineHeight: 19, marginTop: 10 },
});
