const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createFileService } = require('../src/file-service.cjs');
const { CHUNK_BYTES } = require('../src/file-contract.cjs');
const { createRepository } = require('../src/repository.cjs');
const { memoryStore } = require('./helpers/memory-store.cjs');
const user = { id: 'teacher', name: 'Profissional', role: 'teacher', active: true };
const student = { id: 'aluno', name: 'Aluno Teste', phone: '11999999999' };
function fixture() {
  const roots = new Map(), blocks = new Map(), output = new Map(), released = [];
  let failChunks = false, references = false, reads = 0;
  const store = {
    async create(file) { roots.set(file.id, structuredClone(file)); blocks.set(file.id, new Map()); },
    async writeChunks(id, chunks) { if (failChunks) throw new Error('falha de rede'); chunks.forEach(chunk => blocks.get(id).set(chunk.index, structuredClone(chunk))); },
    async finish(id) { roots.get(id).status = 'ready'; },
    async get(id) { const file = roots.get(id); return file ? structuredClone(file) : null; },
    async readChunk(id, index) { reads++; return structuredClone(blocks.get(id)?.get(index)); },
    async remove(id) { roots.delete(id); blocks.delete(id); },
    async listForStudent(user, studentId) { return [...roots.values()].filter(file => file.studentId === studentId); },
    async isReferenced() { return references; },
  };
  const assets = new Map();
  const io = {
    async open(asset) { const data = assets.get(asset.uri); return { size: data.length, read: async (start, length) => data.subarray(start, start + length).toString('base64') }; },
    async materialize(file, readChunk) { const parts = []; for (let i = 0; i < file.chunkCount; i++) parts.push(Buffer.from(await readChunk(i), 'base64')); const uri = 'blob:recovered-' + file.id; output.set(uri, Buffer.concat(parts)); return uri; },
    release: uri => released.push(uri),
  };
  function asset(mimeType, data, name = 'arquivo') { const uri = `file:///private-${assets.size}`; assets.set(uri, data); return { uri, name, mimeType, size: data.length }; }
  return { store, io, roots, blocks, output, released, asset, service: createFileService(store, io), fail: () => { failChunks = true; }, referenced: () => { references = true; }, reads: () => reads };
}
test('arquivo maior que um bloco é recuperado byte a byte após reabrir o serviço', async () => {
  const f = fixture();
  const bytes = Buffer.alloc(CHUNK_BYTES * 2 + 71);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  const ref = await f.service.pack(f.asset('video/mp4', bytes), { user, studentId: 'aluno' });
  assert.equal(f.roots.get(ref.fileId).status, 'ready');
  assert.equal(f.blocks.get(ref.fileId).size, 3);
  for (const block of f.blocks.get(ref.fileId).values()) assert.ok(Buffer.byteLength(JSON.stringify(block)) < 1048576);
  const reopened = createFileService(f.store, f.io);
  const uri = await reopened.resolve(reopened.unpack(ref));
  assert.deepEqual(f.output.get(uri), bytes);
  assert.equal(ref.uri, undefined);
  assert.equal(JSON.stringify([...f.roots.values()]).includes('file:///'), false);
});
test('foto, PDF, vídeo e histórico conservam referências recuperáveis em outro repositório', async () => {
  const f = fixture(), records = memoryStore(), repo = createRepository(records, f.service);
  const photo = f.asset('image/png', Buffer.from([1, 0, 255, 33]), 'foto.png');
  await repo.save(user, { ...student, photo });
  await repo.addRecord(user, 'aluno', { id: 'treino', category: 'Treino', title: 'Treino', exercises: [{ id: 'ex', name: 'Agachamento', sets: '3', reps: '12', video: f.asset('video/mp4', Buffer.from([9, 8, 0, 7])) }] });
  await repo.addRecord(user, 'aluno', { id: 'avaliacao', category: 'Bioimpedância', title: 'Avaliação', performedOn: '2026-11-16', attachment: f.asset('application/pdf', Buffer.from('%PDF-1.4\nPDF de teste'), 'avaliacao.pdf') });
  const reopenedFiles = createFileService(f.store, f.io);
  const [saved] = await createRepository(records, reopenedFiles).list(user);
  assert.equal(saved.records.length, 2);
  for (const asset of [saved.photo, saved.records[0].attachment, saved.records[1].exercises[0].video]) {
    assert.ok(asset.fileId);
    assert.ok(f.output.get(await reopenedFiles.resolve(asset)).length > 0);
  }
  assert.equal(require('../src/studentViews.cjs').studentsForCategory([saved], 'Bioimpedância').length, 1);
});
test('limites verificam o tamanho real e recusam arquivos não permitidos', async () => {
  const f = fixture();
  const photo = f.asset('image/png', Buffer.alloc(2 * 1024 * 1024 + 1)); photo.size = 1;
  await assert.rejects(f.service.pack(photo, { user, studentId: 'aluno' }), /2 MB/);
  await assert.rejects(f.service.pack(f.asset('application/javascript', Buffer.from('abc')), { user, studentId: 'aluno' }), /válido/);
  assert.equal(f.roots.size, 0);
});
test('falha no envio não cria cadastro nem confirma arquivo incompleto', async () => {
  const f = fixture(), data = memoryStore(); f.fail();
  await assert.rejects(createRepository(data, f.service).save(user, { ...student, photo: f.asset('image/png', Buffer.from([1, 2, 3])) }), /rede/);
  assert.equal(data.students.size, 0);
  assert.equal(f.roots.size, 0);
});
test('arquivo incompleto ou bloco alterado é rejeitado na recuperação', async () => {
  const f = fixture();
  const ref = await f.service.pack(f.asset('application/pdf', Buffer.from('pdf'), 'a.pdf'), { user, studentId: 'aluno' });
  f.blocks.get(ref.fileId).delete(0);
  await assert.rejects(f.service.resolve(ref), /incompleto/);
  f.blocks.get(ref.fileId).set(0, { index: 0, data: 'AAAAAA==' });
  await assert.rejects(f.service.resolve(ref), /incompleto/);
});
test('cache evita reler os blocos e é liberado ao sair', async () => {
  const f = fixture();
  const ref = await f.service.pack(f.asset('image/png', Buffer.from([1, 2])), { user, studentId: 'aluno' });
  const uri = await f.service.resolve(ref);
  await f.service.resolve(ref);
  assert.equal(f.reads(), 1);
  f.service.clear(); await Promise.resolve();
  assert.deepEqual(f.released, [uri]);
});
test('falha no cadastro limpa o arquivo novo sem remover arquivo já referenciado', async () => {
  const f = fixture(), data = memoryStore();
  data.createStudent = async () => { throw new Error('falha no banco'); };
  const input = { ...student, photo: f.asset('image/png', Buffer.from([1, 2])) };
  await assert.rejects(createRepository(data, f.service).save(user, input), /banco/);
  assert.equal(f.roots.size, 0);
  f.referenced();
  await assert.rejects(createRepository(data, f.service).save(user, input), /banco/);
  assert.equal(f.roots.size, 1);
});
test('exclusão do aluno limpa arquivos e registros, preservando outros alunos', async () => {
  const f = fixture(), data = memoryStore(), repo = createRepository(data, f.service);
  const photo = f.asset('image/png', Buffer.from([0, 1]));
  await repo.save(user, { ...student, photo });
  await repo.save(user, { ...student, id: 'outro', photo });
  await repo.remove(user, 'aluno');
  assert.equal(f.roots.size, 1);
  assert.equal([...f.roots.values()][0].studentId, 'outro');
  assert.equal((await repo.list(user)).length, 1);
});
