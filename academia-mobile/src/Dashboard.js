import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Avatar, Empty, Icon } from './ui';
import { categoryLabels, categoryMeta, colors as c, dateLabel } from './theme';
const { studentsForCategory } = require('./studentViews.cjs');

export default function Dashboard({ user, students, onStudents, onCategory, onNewStudent, onStudent }) {
  const { width } = useWindowDimensions();
  const numberSize = width >= 850 ? 44 : width < 380 ? 28 : 36;
  const iconSize = width >= 850 ? 48 : width < 380 ? 32 : 38;
  const iconGap = width >= 850 ? 20 : width < 380 ? 8 : 12;
  const allRecords = students.flatMap(student => student.records.map(record => ({ student, record })));
  const recent = [...allRecords].sort((a, b) => b.record.date.localeCompare(a.record.date)).slice(0, 3);
  return <View>
    <View style={s.welcomeRow}><View style={s.welcomeCopy}>
      <Text style={s.eyebrow}>SEU ESPAÇO</Text>
      <Text style={s.welcome}>Bem-vindo, <Text style={{ color: c.lime }}>{user.name}</Text></Text>
    </View><View style={s.date}><Icon name="calendar" size={15} color={c.muted} /><Text style={s.dateText}>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</Text></View></View>

    <View style={s.metricsHeading}><Text style={s.sectionTitle}>Visão do acompanhamento</Text></View>
    <View style={s.metrics}>{Object.entries(categoryMeta).map(([category, meta]) => <Pressable key={category} accessibilityRole="button" accessibilityLabel={categoryLabels[category]} accessibilityHint="Abre os alunos desta categoria" onPress={() => onCategory(category)} style={({ pressed }) => [s.metric, { borderColor: meta.color + '55' }, pressed && s.pressed]}>
      <View style={[s.metricValue, { gap: iconGap }]}><Text style={[s.metricNumber, { fontSize: numberSize }]}>{String(studentsForCategory(students, category).length).padStart(2, '0')}</Text><Icon name={meta.icon} size={iconSize} color={meta.color} /></View>
      <Text style={[s.metricLabel, width < 380 && { fontSize: 13, lineHeight: 19 }]}>{categoryLabels[category]}</Text>
    </Pressable>)}</View>

    <Text style={s.sectionEyebrow}>ALUNOS</Text>
    <View style={s.shortcuts}>
      <Pressable accessibilityRole="button" accessibilityLabel="Seus alunos" onPress={onStudents} style={({ pressed }) => [s.shortcut, pressed && s.pressed]}>
        <View style={s.shortcutTop}><View style={s.tileIcon}><Icon name="users" color={c.lime} size={23} /></View><Icon name="arrow-up-right" color={c.muted} /></View>
        <Text style={s.tileNumber}>{String(students.length).padStart(2, '0')}</Text><Text style={s.tileTitle}>Seus alunos</Text><Text style={s.tileDescription}>Ver todos os alunos</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Novo cadastro" onPress={onNewStudent} style={({ pressed }) => [s.shortcut, s.newShortcut, pressed && s.pressed]}>
        <View style={s.shortcutTop}><View style={[s.tileIcon, { backgroundColor: '#17200f12' }]}><Icon name="user-plus" color={c.ink} size={23} /></View><Icon name="arrow-up-right" color={c.ink} /></View>
        <Text style={[s.tileNumber, { color: c.ink }]}>＋</Text><Text style={[s.tileTitle, { color: c.ink }]}>Novo cadastro</Text><Text style={[s.tileDescription, { color: '#40552e' }]}>Cadastrar aluno</Text>
      </Pressable>
    </View>


    <View style={s.sectionHeading}><Text style={s.sectionTitle}>Últimos acompanhamentos</Text><Icon name="clock" size={17} color={c.muted} /></View>
    {!recent.length && <Empty icon="activity" text="Os registros de treino, nutrição e avaliação dos seus alunos aparecerão aqui." />}
    {recent.map(({ student, record }) => <Pressable key={`${student.id}-${record.id}`} accessibilityRole="button" accessibilityLabel={`Ver ${record.title} de ${student.name}`} onPress={() => onStudent(student, record.category)} style={({ pressed }) => [s.recentCard, pressed && s.pressed]}>
      <Avatar name={student.name} photo={student.photo} color={categoryMeta[record.category].color} />
      <View style={s.recentCopy}><Text style={s.recentName}>{student.name}</Text><Text style={s.recentTitle} numberOfLines={1}>{record.title}</Text><Text style={s.recentDate}>{dateLabel(record.performedOn || record.date)}</Text></View>
      <View style={s.recentCategory}><Icon name={categoryMeta[record.category].icon} size={18} color={categoryMeta[record.category].color} /></View>
    </Pressable>)}

  </View>;
}

const s = StyleSheet.create({
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 25 }, welcomeCopy: { flex: 1 },
  eyebrow: { fontSize: 9, letterSpacing: 1.6, color: c.muted, fontWeight: '700', marginBottom: 9 },
  welcome: { color: c.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.8, lineHeight: 35 },
  date: { flexDirection: 'row', gap: 7, alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: c.border, borderRadius: 10 }, dateText: { color: c.muted, fontSize: 10 },
  sectionEyebrow: { color: c.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: '700', marginTop: 26, marginBottom: 12 }, shortcuts: { flexDirection: 'row', gap: 14 },
  shortcut: { flex: 1, minWidth: 0, padding: 20, borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, newShortcut: { backgroundColor: c.lime, borderColor: c.lime },
  shortcutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, tileIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#c7f76b10', alignItems: 'center', justifyContent: 'center' },
  tileNumber: { fontSize: 39, fontWeight: '800', color: c.text, marginTop: 17, lineHeight: 48, letterSpacing: -1 }, tileTitle: { color: c.text, fontSize: 16, fontWeight: '700', marginTop: 4 }, tileDescription: { color: c.muted, fontSize: 10, lineHeight: 17, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 29, marginBottom: 15, flexWrap: 'wrap' }, sectionTitle: { color: c.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  metricsHeading: { marginBottom: 16 }, metrics: { flexDirection: 'row', gap: 10 }, metric: { flex: 1, minWidth: 0, minHeight: 160, justifyContent: 'center', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderRadius: 20, paddingVertical: 22, paddingHorizontal: 6 }, metricValue: { minHeight: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, metricNumber: { color: c.text, fontWeight: '800', letterSpacing: -1 }, metricLabel: { minHeight: 42, width: '100%', color: c.text, fontSize: 15, fontWeight: '600', lineHeight: 21, marginTop: 13, textAlign: 'center' },
  recentCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderRadius: 18, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, marginBottom: 10 },
  recentCopy: { flex: 1, minWidth: 0 }, recentName: { color: c.text, fontSize: 13, fontWeight: '700' }, recentTitle: { color: c.muted, fontSize: 11, marginTop: 4 }, recentDate: { color: '#7f9183', fontSize: 9, marginTop: 6 }, recentCategory: { padding: 9, borderRadius: 11, backgroundColor: '#ffffff05' },
  pressed: { opacity: 0.7 },
});



