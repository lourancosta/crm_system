// Private-bucket KB media is served through an authenticated app route
// (see kb.upload.ts's getKbMedia) rather than a raw GCS URL. A plain
// <img src> can't send a Bearer header, so the browser has to fetch the
// bytes itself and hand the <img> a local blob: URL instead.
const PRIVATE_MEDIA_PREFIX = '/api/knowledge-base/browse/media/';

export function isPrivateMediaUrl(src: string): boolean {
  return src.startsWith(PRIVATE_MEDIA_PREFIX);
}

export async function resolvePrivateMediaUrl(src: string): Promise<string> {
  const token = localStorage.getItem('token');
  const response = await fetch(src, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  if (!response.ok) throw new Error('Failed to load file');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// Rewrites every private-media <img> src inside an HTML string to a
// same-session blob URL, for read-only rendering (dangerouslySetInnerHTML)
// where the result is never fed back into a save.
export async function resolvePrivateMediaInHtml(html: string): Promise<string> {
  if (!html.includes(PRIVATE_MEDIA_PREFIX)) return html;

  const container = document.createElement('div');
  container.innerHTML = html;
  const imgs = Array.from(container.querySelectorAll('img')).filter((img) =>
    isPrivateMediaUrl(img.getAttribute('src') ?? ''),
  );
  await Promise.all(
    imgs.map(async (img) => {
      try {
        img.src = await resolvePrivateMediaUrl(img.getAttribute('src')!);
      } catch {
        // leave the broken image as-is rather than failing the whole render
      }
    }),
  );
  return container.innerHTML;
}
