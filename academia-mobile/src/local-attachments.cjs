// Legacy metadata compatibility and in-memory adapter used by logic tests.
function createLocalAttachments() {
  const uris = new Map();
  let sequence = 0;
  return {
    pack(asset) {
      if (!asset) return null;
      const localKey = asset.localKey || `${Date.now()}-file-${++sequence}-${Math.random().toString(36).slice(2)}`;
      if (asset.uri) uris.set(localKey, asset.uri);
      return { localKey, name: String(asset.name || 'Arquivo').slice(0, 255), mimeType: asset.mimeType || null, size: asset.size ?? null, width: asset.width ?? null, height: asset.height ?? null };
    },
    unpack(asset) { return asset ? { ...asset, uri: uris.get(asset.localKey) || null, localOnly: true } : null; },
  };
}
module.exports = { createLocalAttachments };
