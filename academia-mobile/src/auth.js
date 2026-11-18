import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser, sendPasswordResetEmail, sendEmailVerification, reload, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getFirebase, getProvisioningAuth } from './firebase';
const { createAuthFlow } = require('./auth-flow.cjs');
async function readProfile(uid) {
  const snapshot = await getDoc(doc(getFirebase().db, 'profiles', uid));
  return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
}
let flow;
function getFlow() {
  getFirebase();
  if (!flow) flow = createAuthFlow({
    signInPassword: async (email, password) => (await signInWithEmailAndPassword(getFirebase().auth, email, password)).user,
    signOut: () => signOut(getFirebase().auth),
    readProfile,
    readStudent: async id => {
      const snapshot = await getDoc(doc(getFirebase().db, 'students', id));
      return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
    },
    currentProfile: () => getFirebase().auth.currentUser ? readProfile(getFirebase().auth.currentUser.uid) : Promise.resolve(null),
    createCredentials: async (email, password) => (await createUserWithEmailAndPassword(getProvisioningAuth(), email, password)).user,
    deleteCredentials: user => deleteUser(user),
    currentIdentity: () => getFirebase().auth.currentUser,
    reloadIdentity: user => reload(user),
    sendVerification: user => {
      user.auth.languageCode = 'pt-BR';
      return sendEmailVerification(user);
    },
    finishProvisioning: () => signOut(getProvisioningAuth()),
    saveProfile: (uid, profile) => setDoc(doc(getFirebase().db, 'profiles', uid), { ...profile, createdAt: serverTimestamp() }),
    saveStudentProfile: (uid, profile) => runTransaction(getFirebase().db, async transaction => {
      const studentRef = doc(getFirebase().db, 'students', profile.studentId);
      const snapshot = await transaction.get(studentRef);
      if (!snapshot.exists() || snapshot.data().deleting) throw new Error('Aluno não encontrado ou em exclusão.');
      if (snapshot.data().authUid) throw new Error('Este aluno já possui acesso. Ele pode recuperar a senha na tela de login.');
      transaction.set(doc(getFirebase().db, 'profiles', uid), { ...profile, createdAt: serverTimestamp() });
      transaction.update(studentRef, { authUid: uid, email: profile.email, updatedAt: serverTimestamp() });
    }),
    listProfiles: async () => {
      const snapshot = await getDocs(collection(getFirebase().db, 'profiles'));
      return snapshot.docs.map(item => ({ ...item.data(), id: item.id })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },
    sendReset: email => sendPasswordResetEmail(getFirebase().auth, email),
    reauthenticate: password => {
      const user = getFirebase().auth.currentUser;
      return reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    },
    updatePassword: password => updatePassword(getFirebase().auth.currentUser, password),
  });
  return flow;
}
export function accessError(error) {
  if (['auth/network-request-failed', 'unavailable', 'deadline-exceeded'].includes(error.code)) return 'Não foi possível conectar. Confira sua internet e tente novamente.';
  if (['auth/too-many-requests', 'resource-exhausted'].includes(error.code)) return 'O Firebase limitou as solicitações. Aguarde e confira as cotas do projeto no Console.';
  if (error.code === 'auth/email-already-in-use') return 'Este e-mail já está cadastrado no Authentication. Confira a conta no Console do Firebase.';
  if (['auth/weak-password', 'auth/password-does-not-meet-requirements'].includes(error.code)) return 'A senha não atende à política configurada no Firebase. Use pelo menos 10 caracteres.';
  if (error.code === 'permission-denied') return 'Acesso negado. Confira se o perfil está ativo e se as regras do Firestore foram publicadas.';
  if (error.code === 'auth/user-disabled') return 'Seu acesso está desativado. Entre em contato com o administrador.';
  if (error.code?.startsWith('auth/')) return 'Não foi possível autenticar. Confira o e-mail e a senha ou use Esqueci minha senha.';
  return error.message || 'Não foi possível concluir. Tente novamente.';
}
export const access = {
  login: (email, password) => getFlow().login(email, password),
  changePassword: (currentPassword, password, confirmation) => getFlow().changePassword(currentPassword, password, confirmation),
  requestPasswordReset: email => getFlow().requestPasswordReset(email),
  listMembers: () => getFlow().listMembers(),
  createMember: input => getFlow().createMember(input),
  createStudentAccess: input => getFlow().createStudentAccess(input),
  requestEmailVerification: () => getFlow().requestEmailVerification(),
  checkEmailVerification: () => getFlow().checkEmailVerification(),
  logout: () => flow ? flow.logout() : Promise.resolve(),
};
