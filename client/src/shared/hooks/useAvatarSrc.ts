import { useEffect, useState } from 'react';
import { resolvePrivateMediaUrl } from '../utils/privateMedia';

// Resolves a User.avatarUrl (an authenticated private-media route) to a
// same-session blob: URL an <img src> can actually use — a plain <img> can't
// send the Bearer header the route requires. Shared by anywhere the current
// user's photo is shown (TopBar's user menu, Settings > General > Profile).
export function useAvatarSrc(avatarUrl: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    resolvePrivateMediaUrl(avatarUrl).then((blobUrl) => {
      if (cancelled) return;
      objectUrl = blobUrl;
      setSrc(blobUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl]);

  return src;
}
