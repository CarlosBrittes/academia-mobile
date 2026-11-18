import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getFirebase } from './firebase';
import * as io from './file-io';
const { createFileService } = require('./file-service.cjs');
const db = () => getFirebase().db;
const ref = id => doc(db(), 'files', id);
const chunkRef = (id, index) => doc(db(), 'files', id, 'chunks', String(index));
const store = {
  async create(file) { const { id, ...data } = file; await setDoc(ref(id), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); },
  async writeChunks(id, chunks) {
    const batch = writeBatch(db());
    chunks.forEach(chunk => batch.set(chunkRef(id, chunk.index), chunk));
    await batch.commit();
  },
  finish: id => updateDoc(ref(id), { status: 'ready', updatedAt: serverTimestamp() }),
  async get(id) { const snapshot = await getDoc(ref(id)); return snapshot.exists() ? { ...snapshot.data(), id } : null; },
  async readChunk(id, index) { const snapshot = await getDoc(chunkRef(id, index)); return snapshot.exists() ? snapshot.data() : null; },
  async remove(id, count) {
    if (!Number.isInteger(count) || count < 1 || count > 54) throw new Error('Referência de arquivo inválida.');
    const batch = writeBatch(db());
    for (let index = 0; index < count; index++) batch.delete(chunkRef(id, index));
    batch.delete(ref(id));
    await batch.commit();
  },
  async listForStudent(user, studentId) {
    const snapshot = await getDocs(query(collection(db(), 'files'), where('studentId', '==', studentId)));
    return snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
  },
  async isReferenced(file) {
    const student = await getDoc(doc(db(), 'students', file.studentId));
    if (!student.exists()) return false;
    if (student.data().photo?.fileId === file.id) return true;
    const records = await getDocs(collection(db(), 'students', file.studentId, 'records'));
    return records.docs.some(item => item.data().attachment?.fileId === file.id || (item.data().exercises || []).some(exercise => exercise.video?.fileId === file.id));
  },
};
export const files = createFileService(store, io);
