import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AssessmentDocument } from './Assessment';
import { RecordDetails } from './Training';
import { Avatar, Badge, Button, Empty, Icon, PageTitle } from './ui';
import { colors as c, dateLabel } from './theme';

const sections = [
  { category: 'Treino', label: 'Treinos', title: 'Meus treinos', icon: 'dumbbell', empty: 'Seu professor ainda não disponibilizou um treino. Assim que ele salvar, você poderá consultar os exercícios e vídeos aqui.' },
  { category: 'Nutrição', label: 'Dietas', title: 'Minhas dietas', icon: 'apple-alt', empty: 'Seu plano alimentar aparecerá aqui quando for disponibilizado pela equipe.' },
  { category: 'Bioimpedância', label: 'Avaliações', title: 'Minhas avaliações', icon: 'file-text', empty: 'Os PDFs das suas avaliações aparecerão aqui quando forem anexados pela equipe.' },
];

function PublishedRecord({ record, current, assessment }) {
  const [open, setOpen] = useState(current);
  return <View style={s.record}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${open ? 'Recolher' : 'Abrir'} ${record.title}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}>
      <View style={s.row}><Badge color={current ? c.lime : c.muted}>{current ? assessment ? 'MAIS RECENTE' : 'PLANO ATUAL' : 'HISTÓRICO'}</Badge><Text style={s.date}>{dateLabel(record.performedOn || record.date)}</Text></View>
      <View style={[s.row, { marginTop: 14 }]}><Text style={s.recordTitle}>{record.title}</Text><Icon name={open ? 'chevron-up' : 'chevron-down'} color={c.lime} size={19} /></View>
      {!!record.author && <Text style={s.meta}>Por {record.author}</Text>}
    </Pressable>
    {open && <>{assessment ? <AssessmentDocument attachment={record.attachment} /> : <RecordDetails record={record} />}
      {!!record.content && <View style={s.notes}><Text style={s.notesLabel}>{record.category === 'Nutrição' ? 'ORIENTAÇÕES' : 'OBSERVAÇÕES'}</Text><Text style={s.content}>{record.content}</Text></View>}
    </>}
  </View>;
}

export default function StudentPortal({ student, busy, onRefresh }) {
  const [category, setCategory] = useState('Treino');
  const section = sections.find(item => item.category === category);
  const records = student.records.filter(record => record.category === category);
  return <>
    <View style={s.welcome}><Avatar name={student.name} photo={student.photo} /><View style={{ flex: 1 }}><Text style={s.greeting}>Olá, {student.name.split(' ')[0]}!</Text><Text style={s.meta}>Seu acompanhamento, sempre com você.</Text></View></View>
    {!!student.goal && <View style={s.goal}><Icon name="target" color={c.lime} size={17} /><Text style={s.goalText}>{student.goal}</Text></View>}
    <View style={s.tabs}>{sections.map(item => <Pressable key={item.category} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: item.category === category }} onPress={() => setCategory(item.category)} style={[s.tab, category === item.category && s.activeTab]}><Icon name={item.icon} size={17} color={category === item.category ? c.ink : c.muted} /><Text style={[s.tabText, category === item.category && { color: c.ink }]}>{item.label}</Text></Pressable>)}</View>
    <View style={s.heading}><PageTitle title={section.title} description={category === 'Treino' ? 'Abra um exercício para ver as orientações e o vídeo de execução.' : 'Confira o que a equipe preparou para você.'} /><Button secondary compact title="Atualizar" icon="refresh-cw" disabled={busy} onPress={onRefresh} /></View>
    {!records.length && <Empty icon={section.icon} text={section.empty} />}
    {records.map((record, index) => <PublishedRecord key={record.id} record={record} current={index === 0} assessment={category === 'Bioimpedância'} />)}
  </>;
}

const s = StyleSheet.create({
  welcome: { flexDirection: 'row', gap: 13, alignItems: 'center', marginBottom: 18 }, greeting: { color: c.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.6 }, meta: { color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, backgroundColor: '#c7f76b0d', borderRadius: 14, marginBottom: 20 }, goalText: { color: c.lime, fontSize: 13, lineHeight: 20, flex: 1 },
  tabs: { flexDirection: 'row', gap: 5, backgroundColor: c.surface, padding: 5, borderRadius: 17, marginBottom: 25 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 }, activeTab: { backgroundColor: c.lime }, tabText: { color: c.muted, fontSize: 12, fontWeight: '700' },
  heading: { alignItems: 'flex-start', marginBottom: 8 }, record: { padding: 20, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginBottom: 16 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, date: { color: c.muted, fontSize: 10 }, recordTitle: { color: c.text, fontSize: 21, lineHeight: 28, fontWeight: '700', flex: 1 },
  notes: { borderTopWidth: 1, borderTopColor: c.border, marginTop: 20, paddingTop: 17 }, notesLabel: { color: c.muted, fontSize: 10, letterSpacing: 1, fontWeight: '700' }, content: { color: '#c5d0c3', fontSize: 14, lineHeight: 23, marginTop: 8 },
});
