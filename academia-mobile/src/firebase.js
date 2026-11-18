import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
let client;
let provisioningAuth;
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
function appNamed(name) { return getApps().some(app => app.name === name) ? getApp(name) : initializeApp(config, name); }
export function getFirebase() {
  if (!Object.values(config).every(Boolean)) throw new Error('Configure os dados do projeto Firebase no arquivo .env para habilitar o acesso.');
  if (!client) {
    if (emulatorHost && !__DEV__) throw new Error('Remova a configuração de emuladores antes de distribuir o aplicativo.');
    const app = appNamed('studio64');
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    if (emulatorHost) {
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, emulatorHost, 8080);
    }
    client = { auth, db };
  }
  return client;
}
export function getProvisioningAuth() {
  getFirebase();
  if (!provisioningAuth) {
    // Keep the main administrator session when Firebase signs in the new account.
    provisioningAuth = initializeAuth(appNamed('studio64-provisioning'), { persistence: inMemoryPersistence });
    if (emulatorHost) connectAuthEmulator(provisioningAuth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  }
  return provisioningAuth;
}
