const { validateStudent, validateExercises, validateMeals, validateAssessment } = require('./domain.cjs');
const { createLocalAttachments } = require('./local-attachments.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
function validId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('Identificador inválido.');
  return value;
}
function createRepository(store, files = createLocalAttachments()) {
  async function undoUploads(assets, error) {
    if (!files.discard) return;
    for (const asset of assets) {
      try { await files.discard(asset); }
      catch { error.message += ' Um arquivo pode ter ficado sem vínculo; a exclusão do aluno também limpa os anexos.'; }
    }
  }
  function session(user) {
    if (!user?.id || user.active === false || !['admin', 'teacher'].includes(user.role)) throw new Error('Entre novamente para continuar.');
  }
  async function owned(user, id) {
    session(user); validId(id);
    const student = await store.getStudent(id);
    if (!student || (user.role !== 'admin' && student.teacherId !== user.id)) throw new Error('Aluno não encontrado ou acesso indisponível.');
    return student;
  }
  async function hydrate(student) {
    const records = await store.listRecords(student.id);
    return { ...student, photo: files.unpack(student.photo), records: records.map(record => ({
      ...record, attachment: files.unpack(record.attachment),
      exercises: (record.exercises || []).map(exercise => ({ ...exercise, video: files.unpack(exercise.video) })),
    })).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) };
  }
  return {
    async getOwn(user) {
      if (!user?.id || user.active !== true || user.role !== 'student') throw new Error('Entre novamente para continuar.');
      const id = validId(user.studentId);
      const student = await store.getStudent(id);
      if (!student || student.deleting || student.authUid !== user.id) throw new Error('Seu cadastro de aluno está indisponível. Entre em contato com seu professor.');
      return hydrate(student);
    },
    async list(user) {
      session(user);
      const students = await store.listStudents(user);
      return Promise.all(students.map(hydrate));
    },
    async save(user, input) {
      session(user);
      const id = validId(input.id);
      const data = validateStudent(input);
      if (data.name.length > 120 || data.goal.length > 2000) throw new Error('Use até 120 caracteres no nome e 2.000 no objetivo.');
      const photo = await files.pack(data.photo, { user, studentId: id });
      try { await store.createStudent(id, { ...data, photo, teacherId: user.id, deleting: false }); }
      catch (error) { if (photo?.fileId && !data.photo?.fileId) await undoUploads([photo], error); throw error; }
      return hydrate(await store.getStudent(id));
    },
    async addRecord(user, studentId, input) {
      const student = await owned(user, studentId);
      if (student.deleting) throw new Error('Este aluno está sendo excluído. Conclua a exclusão antes de continuar.');
      const id = validId(input.id);
      const title = String(input.title || '').trim();
      const content = String(input.content || '').trim();
      if (!['Treino', 'Nutrição', 'Bioimpedância'].includes(input.category) || !title || title.length > 200 || content.length > 8000) throw new Error('Confira a categoria, o título (até 200 caracteres) e as observações (até 8.000 caracteres).');
      const exercises = input.category === 'Treino' ? copy(input.exercises || []) : [];
      const meals = input.category === 'Nutrição' ? copy(input.meals || []) : [];
      if (exercises.length > 100 || meals.length > 100) throw new Error('Use até 100 exercícios ou refeições por registro.');
      if (input.category === 'Treino') validateExercises(exercises);
      if (input.category === 'Nutrição') validateMeals(meals);
      if (input.category === 'Bioimpedância' && (!/^\d{4}-\d{2}-\d{2}$/.test(input.performedOn || '') || !input.attachment?.uri)) throw new Error('Informe a data e anexe o PDF da avaliação.');
      if (input.category === 'Bioimpedância') {
        const [year, month, day] = input.performedOn.split('-');
        validateAssessment(`${day}/${month}/${year}`, input.attachment);
      }
      const uploaded = [];
      async function pack(asset) {
        const packed = await files.pack(asset, { user, studentId });
        if (packed?.fileId && !asset?.fileId) uploaded.push(packed);
        return packed;
      }
      try {
      const packedExercises = [];
      for (const exercise of exercises) packedExercises.push({ id: validId(exercise.id), name: exercise.name, sets: exercise.sets, reps: exercise.reps, load: exercise.load || '', rest: exercise.rest || '', note: exercise.note || '', video: await pack(exercise.video) });
      const data = {
        category: input.category, title, content, performedOn: input.category === 'Bioimpedância' ? input.performedOn : null,
        attachment: input.category === 'Bioimpedância' ? await pack(input.attachment) : null,
        exercises: packedExercises,
        meals: meals.map(meal => ({ id: validId(meal.id), name: meal.name, time: meal.time || '', food: meal.food, alternatives: meal.alternatives || '' })),
        author: user.name, authorId: user.id,
      };
      await store.addRecord(studentId, id, data);
      } catch (error) { await undoUploads(uploaded, error); throw error; }
      return hydrate(await store.getStudent(studentId));
    },
    async remove(user, id) {
      await owned(user, id);
      await store.markDeleting(id);
      if (files.removeForStudent) await files.removeForStudent(user, id);
      await store.deleteRecords(id);
      await store.deleteStudent(id);
    },
  };
}
module.exports = { createRepository };
