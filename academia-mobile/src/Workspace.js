import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Dashboard from './Dashboard';
import WorkspaceHeader from './WorkspaceHeader';
import EmailVerificationNotice from './EmailVerificationNotice';
import { files } from './files';
import Login from './Login';
import Teachers from './Teachers';
import { access, accessError } from './auth';
import { createFirestoreRepository } from './repository';
import StudentPhotoPicker from './StudentPhotoPicker';
import StudentAccessFields from './StudentAccessFields';
import StudentPortal from './StudentPortal';
import { AssessmentAttachment, AssessmentDocument } from './Assessment';
import { TrainingEditor, MealEditor, RecordDetails, blankExercise, blankMeal } from './Training';
import { Avatar, Badge, Button, Empty, Field, Icon, PageTitle } from './ui';
import { categoryLabels, categoryMeta, colors as c, dateLabel, formHeading, todayInput } from './theme';
const { studentsForCategory, lastModifiedAt, categoryLastModifiedAt } = require('./studentViews.cjs');
const { validateStudent, validateAssessment, whatsappURL, studentWelcomeURL, validateExercises, validateMeals, formatDateInput } = require('./domain.cjs');
const { validateStudentAccess } = require('./account-contract.cjs');
const categories = Object.keys(categoryMeta);
const logo = require('../assets/s64-logo.png');
let counter = 0;
const uid = () => `${Date.now()}-${++counter}`;

function Goal({ goal }) {
  return <View style={s.goal}><Icon name="target" size={15} color={c.lime} /><View style={{ flex: 1 }}><Text style={s.goalLabel}>OBJETIVO</Text><Text style={s.goalText}>{goal || 'Vamos definir o próximo objetivo juntos'}</Text></View></View>;
}
function LastModified({ student, category }) {
  const date = category ? categoryLastModifiedAt(student, category) : lastModifiedAt(student);
  const label = date ? new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : category ? 'Nenhum registro nesta categoria' : 'Sem alterações registradas';
  return <View style={s.lastModified} testID={`last-modified-${category || 'student'}`}><Icon name="clock" size={11} color={c.muted} /><Text style={s.lastModifiedText}>Última modificação: {label}</Text></View>;
}
function StudentCard({ student, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir perfil de ${student.name}`} onPress={onPress} style={({ pressed }) => [s.studentCard, pressed && { opacity: 0.7 }]}><View style={s.studentHeading}><Avatar name={student.name} photo={student.photo} /><View style={{ flex: 1 }}><Text style={s.studentName}>{student.name}</Text><Text style={s.small}>{student.deleting ? 'Exclusão pendente. Abra o perfil para concluir.' : `${student.records.length} registros no acompanhamento`}</Text></View><View style={s.circleArrow}><Icon name="arrow-up-right" color={c.lime} size={18} /></View></View><Goal goal={student.goal} /><LastModified student={student} /></Pressable>;
}

export default function Workspace() {
  const [repo] = useState(() => createFirestoreRepository());
  const [teachers, setTeachers] = useState([]);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('login');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('Treino');
  const [query, setQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPicking, setPhotoPicking] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [performedOn, setPerformedOn] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [meals, setMeals] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [studentReturnTo, setStudentReturnTo] = useState('home');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmation, setStudentConfirmation] = useState('');
  const [createStudentLogin, setCreateStudentLogin] = useState(true);
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [welcomeAccess, setWelcomeAccess] = useState(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.title = 'Studio 6.4';
    const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link');
    favicon.rel = 'icon'; favicon.type = 'image/png'; favicon.href = logo.uri;
    if (!favicon.parentNode) document.head.appendChild(favicon);
  }, []);

  function navigate(next) { if (next !== 'profile') setWelcomeAccess(null); setError(''); setNotice(''); setScreen(next); }
  function back() {
    navigate(screen === 'forgotPassword' ? 'login' : screen === 'record' ? 'profile' : screen === 'profile' ? 'students' : screen === 'student' ? studentReturnTo : 'home');
  }
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home' || screen === 'login') return false;
      if (!busy) back(); return true;
    });
    return () => handler.remove();
  }, [screen, studentReturnTo, busy]);
  async function run(fn) {
    if (busy) return;
    setError(''); setNotice(''); setBusy(true);
    try { await fn(); return true; } catch (e) { setError(accessError(e)); return false; }
    finally { setBusy(false); }
  }
  async function refresh(session = user) {
    if (session.role === 'student') {
      try { setSelected(await repo.getOwn(session)); }
      catch (error) { setSelected(null); throw error; }
    } else setRows(await repo.list(session));
  }
  async function login() {
    const found = await access.login(email, password);
    try { await refresh(found); }
    catch (error) { await access.logout(); files.clear(); setSelected(null); setRows([]); throw error; }
    setUser(found); setEmail(found.email); setPassword(''); setConfirmation(''); navigate('home');
  }
  async function logout() { await access.logout(); files.clear(); setUser(null); setTeachers([]); setSelected(null); setRows([]); setEmail(''); setPassword(''); setConfirmation(''); setCurrentPassword(''); setQuery(''); setStudentFilter(null); setPhoto(null); setPhotoPicking(false); resetStudentAccess(); navigate('login'); }
  async function resendVerification() {
    const result = await access.requestEmailVerification();
    setUser(current => ({ ...current, ...result }));
    setNotice(result.emailVerified ? 'Seu e-mail já está confirmado.' : 'Confirmação enviada. Confira seu e-mail e a pasta de spam.');
  }
  async function checkVerification() {
    const result = await access.checkEmailVerification();
    setUser(current => ({ ...current, ...result }));
    setNotice(result.emailVerified ? 'Endereço de e-mail confirmado.' : 'A confirmação ainda não foi identificada. Abra o link recebido e tente novamente.');
  }
  async function changePassword() {
    await access.changePassword(currentPassword, password, confirmation);
    setPassword(''); setConfirmation(''); setCurrentPassword(''); navigate('home'); setNotice('Sua senha foi alterada. Use a nova senha nos próximos logins.');
  }
  function openPassword() { setCurrentPassword(''); setPassword(''); setConfirmation(''); setEmail(user.email); navigate('changePassword'); }
  async function recoverPassword() { const result = await access.requestPasswordReset(email); setNotice(result.message); }
  function forgotPassword() { setPassword(''); setConfirmation(''); navigate('forgotPassword'); }
  function openStudents(category = null) { setStudentFilter(category); setQuery(''); navigate('students'); }
  function openStudent(student, category = 'Treino') {
    if (screen === 'home') { setStudentFilter(null); setQuery(''); }
    resetStudentAccess();
    setSelected(student); setTab(category); navigate('profile');
  }
  function resetStudentAccess() { setStudentEmail(''); setStudentPassword(''); setStudentConfirmation(''); setGrantingAccess(false); setWelcomeAccess(null); }
  function newStudent() { setStudentReturnTo(screen === 'students' ? 'students' : 'home'); setName(''); setPhone(''); setGoal(''); setPhoto(null); setPhotoPicking(false); resetStudentAccess(); setCreateStudentLogin(true); navigate('student'); }
  async function openTeachers() { const list = await access.listMembers(); setTeachers(list); navigate('teachers'); }
  function newRecord() { setTitle(''); setContent(''); setPerformedOn(todayInput()); setAttachment(null); setExercises([blankExercise()]); setMeals([blankMeal()]); navigate('record'); }
  async function saveStudent() {
    const data = validateStudent({ name, phone, goal, photo });
    if (createStudentLogin) validateStudentAccess({ email: studentEmail, password: studentPassword, confirmation: studentConfirmation });
    const student = await repo.save(user, { ...data, id: uid() });
    setRows(current => [...current, student]); setQuery(''); setStudentFilter(null); setSelected(student); setTab('Treino'); navigate('profile');
    if (createStudentLogin) {
      try { await grantStudentAccess(student); }
      catch (error) { setGrantingAccess(true); throw new Error(`O aluno foi cadastrado, mas o acesso ao app não foi liberado. ${accessError(error)} Confira os dados abaixo e tente liberar o acesso novamente.`); }
    } else setNotice('Aluno cadastrado. Você pode liberar o acesso ao app pelo perfil quando quiser.');
  }
  async function grantStudentAccess(student = selected) {
    const welcomeURL = studentWelcomeURL(student, studentEmail, studentPassword);
    const member = await access.createStudentAccess({ studentId: student.id, email: studentEmail, password: studentPassword, confirmation: studentConfirmation });
    const updated = { ...student, authUid: member.id, email: member.email };
    setSelected(updated); setRows(current => current.map(item => item.id === student.id ? updated : item)); resetStudentAccess();
    setWelcomeAccess({ studentId: student.id, url: welcomeURL });
    setNotice(member.verificationSent ? 'Acesso do aluno liberado e confirmação de e-mail enviada. Use “Enviar login pelo WhatsApp” para compartilhar os dados com ele.' : 'Acesso do aluno liberado. O envio da confirmação de e-mail falhou; ele poderá reenviar após entrar. Use “Enviar login pelo WhatsApp” para compartilhar os dados com ele.');
  }
  async function notifyStudentAccess() {
    if (!welcomeAccess || welcomeAccess.studentId !== selected?.id || !selected.authUid || selected.deleting) throw new Error('A mensagem com a senha inicial está disponível logo após liberar o acesso. Para um acesso existente, o aluno pode usar “Esqueci minha senha” no login.');
    await Linking.openURL(welcomeAccess.url);
    setNotice('WhatsApp aberto com o e-mail e a senha inicial do aluno. Revise a mensagem e confirme o envio por lá. Ele poderá alterar a senha após entrar no app.');
  }
  async function saveTeacher(input) {
    const member = await access.createMember(input);
    setTeachers(current => [...current, member].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    setNotice(member.verificationSent ? 'Acesso cadastrado e confirmação de endereço enviada por e-mail. Compartilhe a senha inicial diretamente com o profissional.' : 'Acesso cadastrado, mas o envio da confirmação falhou. O profissional poderá reenviar pela tela inicial após entrar. Compartilhe a senha inicial diretamente com ele.');
  }
  async function saveRecord() {
    if (!title.trim()) throw new Error('Informe um título para o registro.');
    let assessment = {};
    if (tab === 'Bioimpedância') assessment = validateAssessment(performedOn, attachment);
    if (tab === 'Treino') validateExercises(exercises);
    if (tab === 'Nutrição') validateMeals(meals);
    const updated = await repo.addRecord(user, selected.id, { id: uid(), category: tab, title: title.trim(), content: content.trim(), ...assessment, exercises: tab === 'Treino' ? exercises : [], meals: tab === 'Nutrição' ? meals : [], date: new Date().toISOString(), author: user.name });
    setSelected(updated); await refresh(); navigate('profile'); setNotice('Atualização salva. Você já pode avisar o aluno pelo WhatsApp.');
  }
  async function notify() {
    if (!selected.phone) throw new Error('Este aluno de demonstração não tem telefone. Cadastre um aluno com seu número de teste.');
    await Linking.openURL(whatsappURL(selected, tab)); setNotice('WhatsApp aberto. Revise a mensagem e confirme o envio por lá.');
  }
  async function removeStudent() { await repo.remove(user, selected.id); await refresh(); setSelected(null); navigate('students'); }
  function confirmRemove() {
    if (Platform.OS === 'web') { if (window.confirm('Excluir permanentemente o aluno, seus registros e arquivos do Firebase?')) run(removeStudent); }
    else Alert.alert('Excluir aluno?', 'O cadastro, os registros e os arquivos serão removidos permanentemente do Firebase.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => run(removeStudent) }]);
  }

  const filtered = studentsForCategory(rows, studentFilter).filter(item => item.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const records = selected?.records.filter(record => record.category === tab) || [];
  const navItems = [{ id: 'home', title: 'Início', icon: 'grid', onPress: () => navigate('home') }, { id: 'students', title: 'Seus alunos', icon: 'users', onPress: () => openStudents() }, { id: 'student', title: 'Novo cadastro', icon: 'user-plus', onPress: newStudent }];
  const activeNav = ['profile', 'record'].includes(screen) ? 'students' : screen;
  return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content" backgroundColor={c.background} /><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {['login', 'forgotPassword', 'changePassword'].includes(screen) ? <Login mode={screen} email={email} password={password} confirmation={confirmation} currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} setEmail={setEmail} setPassword={setPassword} setConfirmation={setConfirmation} busy={busy} error={error} notice={notice} onForgot={forgotPassword} onBack={() => { setPassword(''); setConfirmation(''); setCurrentPassword(''); navigate(screen === 'changePassword' ? 'home' : 'login'); }} login={() => run(screen === 'changePassword' ? changePassword : screen === 'forgotPassword' ? recoverPassword : login)} /> : <>
      <WorkspaceHeader user={user} busy={busy} teamActive={screen === 'teachers'} onTeam={() => run(openTeachers)} onPassword={openPassword} onLogout={() => run(logout)} />
      {!['home', 'students'].includes(screen) && <View style={s.backRow}><Pressable accessibilityRole="button" accessibilityLabel="Voltar" disabled={busy} onPress={back} style={s.back}><Icon name="arrow-left" color={c.lime} size={17} /><Text style={s.backText}>Voltar</Text></Pressable></View>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}{busy && <ActivityIndicator color={c.lime} style={{ margin: 5 }} />}
      {user.role === 'student' ? <ScrollView contentContainerStyle={[s.page, { maxWidth: 720 }]} keyboardShouldPersistTaps="handled">
        <EmailVerificationNotice user={user} busy={busy} onResend={() => run(resendVerification)} onCheck={() => run(checkVerification)} />
        {selected ? <StudentPortal student={selected} busy={busy} onRefresh={() => run(() => refresh())} /> : <><Empty text="Não foi possível carregar seu acompanhamento. Tente atualizar ou entre em contato com seu professor." /><Button secondary title="Tentar novamente" disabled={busy} onPress={() => run(() => refresh())} /></>}
      </ScrollView> : screen === 'students' ? <FlatList data={filtered} keyExtractor={item => item.id} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<><PageTitle title={categoryLabels[studentFilter] || 'Seus alunos'} /><View style={s.listSummary}>{studentFilter && <Button title="Todos os alunos" secondary icon="arrow-left" compact onPress={() => openStudents()} />}<Button title="Novo aluno" icon="plus" compact onPress={newStudent} /></View><Field label="Buscar aluno" icon="search" value={query} onChangeText={setQuery} placeholder="Digite o nome do aluno" /></>}
        ListEmptyComponent={<Empty text={query ? 'Nenhum aluno corresponde à busca. Tente outro nome.' : studentFilter ? studentFilter === 'Bioimpedância' ? 'Nenhum aluno com avaliação em PDF anexada.' : `Nenhum aluno com ${studentFilter === 'Treino' ? 'treino' : 'plano alimentar'} ativo.` : 'Cadastre o primeiro aluno para começar.'} />} renderItem={({ item }) => <StudentCard student={item} onPress={() => openStudent(item, studentFilter || 'Treino')} />} /> : <ScrollView key={screen === 'record' ? `record-${tab}` : screen} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        {screen === 'home' && <><EmailVerificationNotice user={user} busy={busy} onResend={() => run(resendVerification)} onCheck={() => run(checkVerification)} /><Dashboard user={user} students={rows} onStudents={() => openStudents()} onCategory={openStudents} onNewStudent={newStudent} onStudent={openStudent} /></>}
        {screen === 'profile' && <>
          <View style={s.profileHero}><View style={s.profileTop}><Avatar name={selected.name} photo={selected.photo} large /><Badge>PERFIL DO ALUNO</Badge></View><Text style={s.profileName}>{selected.name}</Text><Goal goal={selected.goal} /></View>
          <View style={[s.formCard, { marginTop: 18 }]}>
            {selected.authUid ? <><Badge>ACESSO AO APP LIBERADO</Badge><Text style={s.body}>{selected.email}</Text><Text style={s.body}>O aluno já pode entrar para consultar seus treinos, vídeos e dietas. Para recuperar a senha, use “Esqueci minha senha” no login.</Text>
              {welcomeAccess?.studentId === selected.id && <><Button secondary title="Enviar login pelo WhatsApp" icon="message-circle" disabled={busy || selected.deleting} onPress={() => run(notifyStudentAccess)} /><Text style={s.small}>A mensagem inclui o e-mail e a senha inicial. Revise e confirme o envio no WhatsApp. Ela fica disponível até sair deste perfil.</Text></>}
            </> : grantingAccess ? <><StudentAccessFields email={studentEmail} password={studentPassword} confirmation={studentConfirmation} onEmail={setStudentEmail} onPassword={setStudentPassword} onConfirmation={setStudentConfirmation} busy={busy} /><Button title="Liberar acesso do aluno" icon="check" loading={busy} disabled={selected.deleting} onPress={() => run(() => grantStudentAccess())} /><Button secondary title="Cancelar" disabled={busy} onPress={resetStudentAccess} /></> : <><Text style={s.sectionTitle}>Acesso do aluno</Text><Text style={s.body}>Libere o acesso para que ele acompanhe os conteúdos que você disponibilizar.</Text><Button secondary title="Liberar acesso ao app" icon="smartphone" disabled={busy || selected.deleting} onPress={() => setGrantingAccess(true)} /></>}
          </View>
          <View style={s.tabs}>{categories.map(category => <Pressable key={category} accessibilityRole="tab" accessibilityLabel={category} accessibilityState={{ selected: tab === category }} aria-selected={tab === category} onPress={() => { setTab(category); setError(''); setNotice(''); }} style={[s.tab, tab === category && s.tabActive]}><Icon name={categoryMeta[category].icon} size={16} color={tab === category ? c.ink : c.muted} /><Text style={[s.tabText, tab === category && { color: c.ink }]}>{category}</Text></Pressable>)}</View>
          <View style={s.moduleHeading}><View style={{ flex: 1 }}><Text style={s.sectionTitle}>{tab}</Text><LastModified student={selected} category={tab} /></View><View style={s.moduleCount}><Text style={s.moduleCountText}>{String(records.length).padStart(2, '0')}</Text></View></View>
          <Button title={tab === 'Bioimpedância' ? 'Nova avaliação' : tab === 'Nutrição' ? 'Novo plano alimentar' : 'Novo treino'} icon="plus" disabled={selected.deleting || busy} onPress={newRecord} />
          {records.length > 0 && <Button secondary title="Avisar atualização pelo WhatsApp" icon="message-circle" disabled={busy} onPress={() => run(notify)} />}
          {records.map((record, index) => <View style={s.record} key={record.id}><View style={s.recordTop}><Badge color={index === 0 ? categoryMeta[tab].color : c.muted}>{index === 0 ? tab === 'Bioimpedância' ? 'ÚLTIMA AVALIAÇÃO' : 'PLANO ATUAL' : 'HISTÓRICO'}</Badge><Text style={s.recordDate}>{dateLabel(record.performedOn || record.date)}</Text></View><Text style={s.recordTitle}>{record.title}</Text>
            {tab === 'Bioimpedância' ? <><Text style={s.small}>Realizada em {dateLabel(record.performedOn || record.date)}</Text><AssessmentDocument attachment={record.attachment} /></> : <RecordDetails record={record} />}
            {!!record.content && <View style={s.notes}><Text style={s.notesLabel}>{tab === 'Nutrição' ? 'ORIENTAÇÕES GERAIS' : 'OBSERVAÇÕES'}</Text><Text style={s.recordBody}>{record.content}</Text></View>}{!!record.author && <View style={s.author}><Icon name="check-circle" size={12} color={c.muted} /><Text style={s.small}>Por {record.author}</Text></View>}
          </View>)}
          {!records.length && <Empty icon={categoryMeta[tab].icon} text={`O primeiro registro de ${tab.toLowerCase()} começa com você. Adicione um acompanhamento.`} />}
          <Pressable accessibilityRole="button" style={s.delete} disabled={busy} onPress={confirmRemove}><Icon name="trash-2" size={14} color={c.danger} /><Text style={s.deleteText}>{selected.deleting ? 'Concluir exclusão pendente' : 'Excluir cadastro'}</Text></Pressable>
        </>}
        {screen === 'student' && <><PageTitle title="Cadastro do novo aluno" /><View style={s.formCard}><View style={s.formIntro}><View style={s.introIcon}><Icon name="user-plus" color={c.lime} size={25} /></View><View style={{ flex: 1 }}><Text style={s.sectionTitle}>Dados do aluno</Text><Text style={s.body}>Este aluno ficará vinculado à sua conta.</Text></View></View><StudentPhotoPicker name={name} photo={photo} onChange={setPhoto} onPickingChange={setPhotoPicking} disabled={busy} /><Field label="Nome completo" value={name} onChangeText={setName} placeholder="Como seu aluno se chama?" icon="user" /><Field label="WhatsApp com DDD" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="(11) 99999-9999" icon="phone" hint="Usado para avisar sobre atualizações do acompanhamento." /><Field label="Objetivo" value={goal} onChangeText={setGoal} placeholder="Ex.: fortalecimento e qualidade de vida" icon="target" />
          <Pressable accessibilityRole="checkbox" accessibilityLabel="Criar acesso do aluno ao app" accessibilityState={{ checked: createStudentLogin }} disabled={busy} onPress={() => { setCreateStudentLogin(!createStudentLogin); resetStudentAccess(); }} style={[s.formIntro, { marginTop: 20 }]}><Icon name={createStudentLogin ? 'check-square' : 'square'} color={c.lime} /><View style={{ flex: 1 }}><Text style={s.body}>Criar acesso do aluno ao app</Text><Text style={s.small}>Você também pode liberar o acesso depois, pelo perfil.</Text></View></Pressable>
          {createStudentLogin && <StudentAccessFields email={studentEmail} password={studentPassword} confirmation={studentConfirmation} onEmail={setStudentEmail} onPassword={setStudentPassword} onConfirmation={setStudentConfirmation} busy={busy} />}
          <Button title={createStudentLogin ? 'Cadastrar aluno e liberar acesso' : 'Cadastrar aluno'} icon="arrow-right" loading={busy} disabled={photoPicking} onPress={() => run(saveStudent)} /></View></>}
        {screen === 'teachers' && user.role === 'admin' && <Teachers teachers={teachers} busy={busy} onCreate={input => run(() => saveTeacher(input))} />}
        {screen === 'record' && <><PageTitle eyebrow={`${selected.name.toUpperCase()} / ${tab.toUpperCase()}`} title={tab === 'Treino' ? 'Novo treino' : tab === 'Nutrição' ? 'Novo plano alimentar' : 'Nova avaliação'} /><View style={s.formCard}>
          <Field label={tab === 'Treino' ? 'Nome do treino' : tab === 'Nutrição' ? 'Nome do plano alimentar' : 'Título da avaliação'} labelStyle={tab === 'Treino' ? formHeading : undefined} value={title} onChangeText={setTitle} placeholder={tab === 'Treino' ? 'Treino A · Força e movimento' : tab === 'Nutrição' ? 'Plano alimentar · Novembro' : 'Ex.: Avaliação de novembro'} icon="edit-3" />
          {tab === 'Bioimpedância' && <><Field label="Data realizada" icon="calendar" value={performedOn} onChangeText={value => setPerformedOn(formatDateInput(value, performedOn))} keyboardType="number-pad" inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" /><AssessmentAttachment attachment={attachment} onChange={value => { setAttachment(value); setError(''); }} /></>}
          {tab === 'Treino' && <TrainingEditor exercises={exercises} onChange={setExercises} />}{tab === 'Nutrição' && <MealEditor meals={meals} onChange={setMeals} />}
          <Field label={tab === 'Nutrição' ? 'Orientações gerais (opcional)' : 'Observações gerais (opcional)'} value={content} onChangeText={setContent} multiline placeholder="Um cuidado a mais no acompanhamento…" /><Button title="Salvar atualização" icon="check" loading={busy} onPress={() => run(saveRecord)} />
        </View></>}
      </ScrollView>}
      {user.role !== 'student' && <View style={s.bottomBar}><View style={s.bottomInner}>{navItems.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ selected: activeNav === item.id, disabled: busy }} disabled={busy} onPress={item.onPress} style={s.bottomItem}><View style={[s.navIcon, activeNav === item.id && s.navIconActive]}><Icon name={item.icon} size={20} color={activeNav === item.id ? c.lime : '#7f9185'} /></View><Text style={[s.navText, activeNav === item.id && { color: c.lime }]}>{item.title}</Text></Pressable>)}</View></View>}
    </>}
  </KeyboardAvoidingView></SafeAreaView>;
}

const s = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: c.background }, page: { paddingHorizontal: 20, paddingTop: 27, paddingBottom: 35, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  lastModified: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 13 }, lastModifiedText: { color: c.muted, fontSize: 10, lineHeight: 16, flexShrink: 1 },
  backRow: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 15 }, back: { flexDirection: 'row', gap: 8, paddingVertical: 5, alignSelf: 'flex-start', alignItems: 'center' }, backText: { fontSize: 12, color: c.lime, fontWeight: '600' }, body: { color: c.muted, fontSize: 12, lineHeight: 20, marginTop: 6 }, small: { color: c.muted, fontSize: 10, lineHeight: 16, marginTop: 5 }, sectionTitle: { color: c.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  listSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }, studentCard: { backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 19, marginTop: 7, marginBottom: 8 }, studentHeading: { flexDirection: 'row', gap: 12, alignItems: 'center' }, studentName: { color: c.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }, circleArrow: { backgroundColor: '#c7f76b0b', width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  goal: { marginTop: 17, flexDirection: 'row', gap: 10, padding: 13, backgroundColor: '#c7f76b0d', borderLeftWidth: 2, borderLeftColor: c.lime, borderRadius: 10 }, goalLabel: { color: '#91a17e', fontSize: 8, fontWeight: '700', letterSpacing: 1.3, marginBottom: 5 }, goalText: { color: c.lime, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  profileHero: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 25, padding: 23 }, profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, profileName: { color: c.text, fontSize: 30, fontWeight: '800', lineHeight: 37, letterSpacing: -1, marginTop: 20 }, tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, padding: 5, borderRadius: 17, backgroundColor: c.surface, marginTop: 25 }, tab: { flex: 1, flexBasis: '29%', flexDirection: 'row', gap: 6, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, tabActive: { backgroundColor: c.lime }, tabText: { color: c.muted, fontSize: 10, fontWeight: '700' }, moduleHeading: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 24, marginBottom: 15 }, moduleCount: { padding: 12, backgroundColor: c.surface, borderRadius: 12 }, moduleCountText: { color: c.muted, fontWeight: '700', fontSize: 17 },
  record: { padding: 21, borderRadius: 23, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginTop: 18 }, recordTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, recordDate: { color: c.muted, fontSize: 10 }, recordTitle: { color: c.text, fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.6, marginTop: 18, marginBottom: 5 }, notes: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 17, marginTop: 20 }, notesLabel: { color: c.muted, fontSize: 8, letterSpacing: 1.4, fontWeight: '700' }, recordBody: { color: '#c5d0c3', lineHeight: 23, fontSize: 13, marginTop: 8 }, author: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 13 }, delete: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 15 }, deleteText: { color: c.danger, fontSize: 11 },
  formCard: { padding: 21, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border }, formIntro: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 17 }, introIcon: { padding: 14, borderRadius: 17, backgroundColor: '#c7f76b12' },
  error: { backgroundColor: '#3b2522', color: c.danger, padding: 14, marginHorizontal: 20, marginTop: 12, borderRadius: 12, fontSize: 12, lineHeight: 19 }, notice: { backgroundColor: '#243725', color: '#d1efba', padding: 14, marginHorizontal: 20, marginTop: 12, borderRadius: 12, fontSize: 12, lineHeight: 19 }, bottomBar: { backgroundColor: '#141d17', borderTopWidth: 1, borderTopColor: c.border }, bottomInner: { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 9, maxWidth: 650, width: '100%', alignSelf: 'center' }, bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 }, navIcon: { paddingVertical: 7, paddingHorizontal: 19, borderRadius: 12 }, navIconActive: { backgroundColor: '#c7f76b13' }, navText: { color: '#7f9185', fontSize: 9, fontWeight: '600' },
});





