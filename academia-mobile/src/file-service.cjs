const { CHUNK_BYTES, validateFileSize, validFileId, fileReference, validateChunk } = require('./file-contract.cjs');
const { createLocalAttachments } = require('./local-attachments.cjs');
let sequence = 0;
function createFileService(store, io) {
  const local = createLocalAttachments(), cache = new Map();
  let revision = 0;
  function validateMetadata(file) {
    if (!file || file.status !== 'ready') throw new Error('O arquivo não está disponível ou o envio não foi concluído.');
    validateFileSize(file.mimeType, file.size);
    if (file.chunkCount !== Math.ceil(file.size / CHUNK_BYTES)) throw new Error('A referência do arquivo está incompleta.');
  }
  return {
    async pack(asset, context) {
      if (!asset) return null;
      if (asset.fileId) return fileReference(asset);
      if (!context?.user?.id || !context.studentId) throw new Error('Entre novamente para salvar o arquivo.');
      const source = await io.open(asset);
      const mimeType = asset.mimeType || source.mimeType;
      try {
        validateFileSize(mimeType, source.size);
        const id = `${Date.now()}-file-${++sequence}-${Math.random().toString(36).slice(2)}`;
        const file = { id, name: String(asset.name || 'Arquivo').slice(0, 255), mimeType, size: source.size, width: asset.width ?? null, height: asset.height ?? null, chunkCount: Math.ceil(source.size / CHUNK_BYTES), ownerId: context.user.id, studentId: context.studentId, status: 'uploading' };
        await store.create(file);
        try {
          let batch = [];
          for (let index = 0; index < file.chunkCount; index++) {
            const length = Math.min(CHUNK_BYTES, file.size - index * CHUNK_BYTES);
            const data = validateChunk(await source.read(index * CHUNK_BYTES, length), length);
            batch.push({ index, data });
            if (batch.length === 8 || index === file.chunkCount - 1) { await store.writeChunks(id, batch); batch = []; }
          }
          await store.finish(id);
          return fileReference(file);
        } catch (error) {
          try { await store.remove(id, file.chunkCount); }
          catch { throw new Error(`${error.message} O envio ficou incompleto; tente salvar novamente. A exclusão do aluno também limpa esses arquivos.`); }
          throw error;
        }
      } finally { await source.close?.(); }
    },
    unpack(asset) { return asset?.fileId ? { ...fileReference(asset), uri: null } : local.unpack(asset); },
    async discard(asset) {
      if (!asset?.fileId) return;
      const file = await store.get(validFileId(asset.fileId));
      if (file && !await store.isReferenced(file)) await store.remove(asset.fileId, file.chunkCount);
    },
    async removeForStudent(user, studentId) {
      const files = await store.listForStudent(user, studentId);
      for (const file of files) await store.remove(file.id, file.chunkCount);
    },
    async resolve(asset) {
      if (!asset?.fileId) return asset?.uri || null;
      const id = validFileId(asset.fileId), generation = revision;
      if (!cache.has(id)) {
        const pending = (async () => {
          const file = await store.get(id);
          validateMetadata(file);
          const uri = await io.materialize(file, async index => {
            const chunk = await store.readChunk(id, index);
            if (!chunk || chunk.index !== index) throw new Error('O arquivo está incompleto.');
            return validateChunk(chunk.data, Math.min(CHUNK_BYTES, file.size - index * CHUNK_BYTES));
          });
          if (generation !== revision) { io.release(uri); throw new Error('A sessão foi encerrada. Abra o arquivo após entrar novamente.'); }
          return uri;
        })().catch(error => { if (cache.get(id) === pending) cache.delete(id); throw error; });
        cache.set(id, pending);
      }
      return cache.get(id);
    },
    clear() {
      revision++;
      for (const entry of cache.values()) entry.then(uri => io.release(uri)).catch(() => {});
      cache.clear();
    },
  };
}
module.exports = { createFileService };
