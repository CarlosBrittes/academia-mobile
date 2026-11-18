import { useEffect, useState } from 'react';
import { files } from './files';
export default function useFileAsset(asset, enabled = true) {
  const [result, setResult] = useState(null);
  const id = asset?.fileId;
  useEffect(() => {
    if (!enabled || !id) return;
    let live = true;
    files.resolve(asset).then(uri => { if (live) setResult({ id, uri }); })
      .catch(error => { if (live) setResult({ id, error: error.message }); });
    return () => { live = false; };
  }, [id, enabled]);
  if (!id) return { uri: asset?.uri || null, loading: false, error: '' };
  if (result?.id === id) return { loading: false, error: '', ...result };
  return { uri: null, loading: enabled, error: '' };
}
