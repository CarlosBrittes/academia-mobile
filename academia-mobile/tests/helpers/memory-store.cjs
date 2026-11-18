function memoryStore() {
  const students = new Map(), records = new Map();
  let clock = Date.now();
  const clone = value => value == null ? null : structuredClone(value);
  const time = () => new Date(++clock).toISOString();
  return {
    students, records, failDelete: false,
    async getStudent(id) { return clone(students.get(id)); },
    async listStudents(user) { return clone([...students.values()].filter(student => user.role === 'admin' || student.teacherId === user.id)); },
    async listRecords(id) { return clone([...(records.get(id) || new Map()).values()]); },
    async createStudent(id, input) {
      if (students.has(id)) throw new Error('Cadastro já existe.');
      const now = time();
      students.set(id, { ...clone(input), id, createdAt: now, updatedAt: now });
      records.set(id, new Map());
    },
    async addRecord(id, recordId, input) {
      const student = students.get(id);
      if (!student || student.deleting) throw new Error('Aluno em exclusão.');
      if (records.get(id).has(recordId)) throw new Error('Este registro já foi salvo.');
      const now = time();
      records.get(id).set(recordId, { ...clone(input), id: recordId, date: now, updatedAt: now });
      student.updatedAt = now;
    },
    async markDeleting(id) { students.get(id).deleting = true; },
    async deleteRecords(id) { if (this.failDelete) throw new Error('sem rede'); records.get(id).clear(); },
    async deleteStudent(id) { students.delete(id); records.delete(id); },
  };
}
module.exports = { memoryStore };
