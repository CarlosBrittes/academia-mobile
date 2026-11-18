import { toByteArray } from 'base64-js';
export async function open(asset) {
  const result = await fetch(asset.uri);
  if (!result.ok) throw new Error('Selecione o arquivo novamente.');
  const blob = await result.blob();
  return {
    size: blob.size, mimeType: blob.type,
    read: (offset, length) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
      reader.readAsDataURL(blob.slice(offset, offset + length));
    }),
  };
}
export async function materialize(file, readChunk) {
  const chunks = [];
  for (let index = 0; index < file.chunkCount; index++) chunks.push(toByteArray(await readChunk(index)));
  return URL.createObjectURL(new Blob(chunks, { type: file.mimeType }));
}
export function release(uri) { URL.revokeObjectURL(uri); }
