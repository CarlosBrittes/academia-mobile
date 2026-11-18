function studentsForCategory(students, category) {
  if (!category) return students;
  
  // não visualiza alunos sem registros da categoria, ou sem anexo de bioimpedância
  return students.filter(student => (student.records || []).some(record =>
    record.category === category && (category !== 'Bioimpedância' || Boolean(record.attachment?.uri || record.attachment?.localKey || record.attachment?.fileId))
  ));
}

function lastModifiedAt(student) {
  const dates = [student.createdAt, student.updatedAt, ...(student.records || []).map(record => record.date)]
    .map(value => Date.parse(value)).filter(Number.isFinite);
  return dates.length ? new Date(Math.max(...dates)).toISOString() : null;
}

function categoryLastModifiedAt(student, category) {
  const dates = (student.records || []).filter(record => record.category === category)
    .flatMap(record => [record.updatedAt, record.date]).map(value => Date.parse(value)).filter(Number.isFinite);
  return dates.length ? new Date(Math.max(...dates)).toISOString() : null;
}

module.exports = { studentsForCategory, lastModifiedAt, categoryLastModifiedAt };
