import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Button, Icon } from './ui';
import { colors as c } from './theme';
import { files } from './files';
const { validatePdf } = require('./domain.cjs');

const sizeLabel = size => !size ? 'Documento PDF' : size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;

export function AssessmentAttachment({ attachment, onChange }) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  async function pick() {
    if (picking) return;
    setPicking(true); setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false, base64: false });
      if (!result.canceled) onChange(validatePdf(result.assets[0]));
    } catch (e) { setError(e.message || 'Não foi possível anexar o PDF. Tente novamente.'); }
    finally { setPicking(false); }
  }
  return <View style={s.section}>
    <Text style={s.label}>PDF da avaliação</Text>
    {attachment ? <View style={s.attached}>
      <View style={s.fileIcon}><Icon name="file-text" color={c.lime} size={27} /></View>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={s.filename} numberOfLines={2}>{attachment.name}</Text><Text style={s.meta}>{sizeLabel(attachment.size)} · Pronto para salvar</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Remover PDF" onPress={() => { onChange(null); setError(''); }} style={s.remove}><Icon name="x" size={18} color={c.muted} /></Pressable>
    </View> : <Pressable accessibilityRole="button" accessibilityLabel="Anexar PDF da avaliação" disabled={picking} onPress={pick} style={({ pressed }) => [s.upload, pressed && { opacity: 0.7 }]}>
      <View style={s.uploadIcon}><Icon name="upload-cloud" color={c.lime} size={28} /></View><Text style={s.uploadTitle}>Anexar PDF da avaliação</Text><Text style={s.uploadHint}>{picking ? 'Selecionando arquivo…' : 'SELECIONE UM PDF · ATÉ 5 MB'}</Text>
    </Pressable>}
    {!!attachment && <Button secondary compact title="Trocar PDF" icon="refresh-cw" onPress={pick} disabled={picking} />}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Text style={s.hint}>O PDF, a data e os dados da avaliação serão salvos no Firebase.</Text>
  </View>;
}

export function AssessmentDocument({ attachment }) {
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  async function open() {
    if (opening) return;
    setError(''); setOpening(true);
    let viewer;
    try {
      // Reserve the tab during the click; opening it after a download may be blocked.
      if (Platform.OS === 'web') {
        viewer = window.open('about:blank', '_blank');
        if (!viewer) throw new Error('Permita abrir uma nova aba para visualizar o PDF.');
        viewer.opener = null;
      }
      const uri = await files.resolve(attachment);
      if (!uri) throw new Error('O arquivo não está disponível nesta sessão.');
      if (Platform.OS === 'web') {
        viewer.location.replace(uri);
      } else {
        if (!await Sharing.isAvailableAsync()) throw new Error('Não foi possível abrir o PDF neste dispositivo.');
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: attachment.name });
      }
    } catch (e) { viewer?.close(); setError(e.message || 'Não foi possível abrir o PDF. Anexe o arquivo novamente.'); }
    finally { setOpening(false); }
  }
  if (!attachment) return <Text style={s.hint}>Nenhum PDF anexado a esta avaliação.</Text>;
  return <View style={s.document}>
    <View style={s.attached}><View style={s.fileIcon}><Icon name="file-text" color={c.lime} size={25} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.filename}>{attachment.name}</Text><Text style={s.meta}>{sizeLabel(attachment.size)}</Text></View><Text style={s.pdfTag}>PDF</Text></View>
    {(attachment.uri || attachment.fileId) ? <Button secondary title={Platform.OS === 'web' ? 'Abrir PDF' : 'Abrir / compartilhar PDF'} icon="external-link" loading={opening} onPress={open} /> : <Text style={s.hint}>O nome deste PDF está salvo. Este anexo antigo não foi enviado ao Firebase.</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}

const s = StyleSheet.create({
  section: { marginVertical: 16 }, label: { color: '#d6ded4', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  upload: { alignItems: 'center', padding: 25, backgroundColor: '#c7f76b06', borderWidth: 1, borderColor: '#c7f76b65', borderStyle: 'dashed', borderRadius: 21 },
  uploadIcon: { padding: 15, backgroundColor: '#c7f76b15', borderRadius: 18, marginBottom: 15 }, uploadTitle: { color: c.text, fontSize: 16, fontWeight: '700' }, uploadHint: { color: c.lime, fontSize: 9, letterSpacing: 0.8, marginTop: 18, fontWeight: '700' },
  attached: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#121a15', borderRadius: 16, padding: 16, borderColor: c.border, borderWidth: 1 }, fileIcon: { width: 45, height: 50, backgroundColor: '#c7f76b12', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, filename: { color: c.text, fontSize: 13, fontWeight: '600', lineHeight: 19 }, meta: { color: c.muted, fontSize: 10, marginTop: 5 }, remove: { padding: 8 }, hint: { color: c.muted, fontSize: 11, lineHeight: 18, marginTop: 9 }, error: { color: c.danger, fontSize: 12, lineHeight: 19, marginTop: 10 }, document: { marginTop: 16 }, pdfTag: { color: c.lime, fontSize: 9, fontWeight: '700' },
});

