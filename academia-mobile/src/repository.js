import { collection, doc, getDoc, getDocs, query, where, limit, runTransaction, writeBatch, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebase } from './firebase';
import { files } from './files';
const { createRepository } = require('./repository.cjs');
const convert = snapshot => {
  const data = snapshot.data();
  for (const key of ['createdAt', 'updatedAt', 'date']) if (data[key]?.toDate) data[key] = data[key].toDate().toISOString();
  return { ...data, id: snapshot.id };
};
export function createFirestoreRepository() {
  const db = () => getFirebase().db;
  const studentRef = id => doc(db(), 'students', id);
  const recordsRef = id => collection(db(), 'students', id, 'records');
  return createRepository({
    async getStudent(id) { const snapshot = await getDoc(studentRef(id)); return snapshot.exists() ? convert(snapshot) : null; },
    async listStudents(user) {
      const source = collection(db(), 'students');
      const snapshot = await getDocs(user.role === 'admin' ? source : query(source, where('teacherId', '==', user.id)));
      return snapshot.docs.map(convert).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },
    async listRecords(id) { return (await getDocs(recordsRef(id))).docs.map(convert); },
    async createStudent(id, input) {
      await runTransaction(db(), async transaction => {
        const ref = studentRef(id);
        if ((await transaction.get(ref)).exists()) throw new Error('Cadastro já existe.');
        transaction.set(ref, { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });
    },
    async addRecord(id, recordId, input) {
      await runTransaction(db(), async transaction => {
        const parent = studentRef(id);
        const record = doc(recordsRef(id), recordId);
        const student = await transaction.get(parent);
        const existing = await transaction.get(record);
        if (!student.exists() || student.data().deleting) throw new Error('Aluno não encontrado ou em exclusão.');
        if (existing.exists()) throw new Error('Este registro já foi salvo.');
        transaction.set(record, { ...input, date: serverTimestamp(), updatedAt: serverTimestamp() });
        transaction.update(parent, { updatedAt: serverTimestamp() });
      });
    },
    async markDeleting(id) {
      await runTransaction(db(), async transaction => {
        const ref = studentRef(id);
        if (!(await transaction.get(ref)).exists()) throw new Error('Aluno não encontrado.');
        transaction.update(ref, { deleting: true, updatedAt: serverTimestamp() });
      });
    },
    async deleteRecords(id) {
      while (true) {
        const snapshot = await getDocs(query(recordsRef(id), limit(400)));
        if (snapshot.empty) break;
        const batch = writeBatch(db());
        snapshot.docs.forEach(record => batch.delete(record.ref));
        await batch.commit();
      }
    },
    deleteStudent: id => deleteDoc(studentRef(id)),
  }, files);
}
