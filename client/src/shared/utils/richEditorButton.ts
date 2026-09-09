function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A real <button> isn't clickable in HTML email, so the universal pattern is
// a styled <a> with inline styles (no CSS class — has to render standalone
// wherever it ends up, same reasoning as the callout/image markup).
export function buildButtonHtml(url: string, label: string): string {
  const href = escapeAttr(url);
  const text = escapeHtml(label);
  return (
    `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 20px;` +
    `margin:12px 0;background-color:#1e5e6c;color:#ffffff;text-decoration:none;border-radius:6px;` +
    `font-weight:600;font-size:14px;">${text}</a><p><br></p>`
  );
}
