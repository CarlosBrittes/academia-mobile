const MB = 1024 * 1024;
const FILE_LIMITS = { photo: 2 * MB, pdf: 5 * MB, video: 10 * MB };
// 192 KiB of binary data becomes 256 KiB of base64, below Firestore's 1 MiB/doc.
const CHUNK_BYTES = 192 * 1024;
function fileKind(mimeType) {
  if (mimeType?.startsWith('image/') && mimeType !== 'image/svg+xml') return 'photo';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType?.startsWith('video/')) return 'video';
  throw new Error('Selecione uma foto, um PDF ou um vídeo válido.');
}
function validateFileSize(mimeType, size) {
  const kind = fileKind(mimeType);
  if (!Number.isInteger(size) || size <= 0 || size > FILE_LIMITS[kind]) throw new Error(`O limite é de ${FILE_LIMITS[kind] / MB} MB por ${kind === 'photo' ? 'foto' : kind === 'pdf' ? 'PDF' : 'vídeo'}.`);
  return kind;
}
function validFileId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('Referência de arquivo inválida.');
  return id;
}
function fileReference(file) {
  return { fileId: validFileId(file.fileId || file.id), name: String(file.name || 'Arquivo').slice(0, 255), mimeType: file.mimeType, size: file.size, width: file.width ?? null, height: file.height ?? null };
}
function validateChunk(data, expectedBytes) {
  if (typeof data !== 'string' || data.length % 4 || data.length > 262144 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('Não foi possível ler um bloco do arquivo.');
  const bytes = data.length / 4 * 3 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
  if (bytes !== expectedBytes) throw new Error('O arquivo está incompleto. Selecione-o novamente.');
  return data;
}
module.exports = { FILE_LIMITS, CHUNK_BYTES, validateFileSize, validFileId, fileReference, validateChunk };
