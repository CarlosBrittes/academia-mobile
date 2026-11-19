import * as FileSystem from 'expo-file-system/legacy';
import { File, Paths } from 'expo-file-system';
import { toByteArray } from 'base64-js';
export async function open(asset) {
  const info = await FileSystem.getInfoAsync(asset.uri);
  if (!info.exists || info.isDirectory) throw new Error('Selecione o arquivo novamente.');
  return { size: info.size, read: (position, length) => FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64, position, length }) };
}
export async function materialize(file, readChunk) {
  const extension = file.mimeType === 'application/pdf' ? 'pdf' : file.mimeType.startsWith('video/') ? 'mp4' : file.mimeType === 'image/png' ? 'png' : 'jpg';
  const target = new File(Paths.cache, `studio64-${file.id}-${Date.now()}.${extension}`);
  target.create({ overwrite: true });
  const handle = target.open();
  try {
    for (let index = 0; index < file.chunkCount; index++) {
  const chunk = await readChunk(index);
  await handle.writeBytes(toByteArray(chunk));
}
    return target.uri;
  } catch (error) { handle.close(); target.delete(); throw error; }
  finally { try { handle.close(); } catch {} }
}
export function release(uri) { FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); }
