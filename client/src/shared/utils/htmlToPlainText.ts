// Lines that mail clients prepend to a quoted reply chain (Apple
// Mail/Gmail's English "On ... wrote:", Gmail's Portuguese "Em ...
// escreveu:", and classic Outlook "-----Original Message-----") — anything
// from the first match onward is the previous message(s) being quoted back,
// not new content the sender actually wrote.
const QUOTE_HEADER_PATTERNS = [
  /^on .+ wrote:\s*$/im,
  /^em .+ escreveu:\s*$/im,
  /^-{2,}\s*original message\s*-{2,}/im,
];

function stripQuotedReply(text: string): string {
  let cutIndex = -1;
  for (const pattern of QUOTE_HEADER_PATTERNS) {
    const match = pattern.exec(text);
    if (match && (cutIndex === -1 || match.index < cutIndex)) {
      cutIndex = match.index;
    }
  }
  return cutIndex === -1 ? text : text.slice(0, cutIndex).trim();
}

// Ticket descriptions and inbound-email history entries store raw HTML
// (straight from the source email) but are displayed as plain text fields,
// not rendered as markup — so strip tags down to readable text instead of
// showing literal "<p>...</p>" on screen. Deliberately not rendered via
// dangerouslySetInnerHTML: this HTML comes from external inbound email, so
// treat it as untrusted rather than risk executing it in the browser.
export function htmlToPlainText(html: string): string {
  const plain = html
    // <head> (title/meta/style) is never message content — strip it whole
    // first, plus any stray <style>/<script> blocks some email templates
    // duplicate in the body (client-specific CSS overrides), so their text
    // content doesn't leak through the tag-strip below as raw CSS/JS.
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Mail clients wrap the quoted thread history in a blockquote — drop it
    // (and everything nested inside it) before the rest of the tag strip.
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
    .replace(/<(br|\/p|\/div|\/li|\/tr)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    // Outlook-style HTML wraps every line in its own <div>, including blank
    // ones (<div><br></div>) — the source's own indentation/&nbsp; whitespace
    // sits right next to those newlines, so a line that's blank in the
    // original email survives as "\n \n" instead of "\n\n\n". That space
    // breaks the \n{3,} collapse below, so strip whitespace touching a
    // newline first (i.e. trim each line) before collapsing blank runs.
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return stripQuotedReply(plain);
}
