/** HTML-entity-encode text so it is safe to place inside an HTML attribute or tag body. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Convert markdown string to HTML, handling Obsidian extensions.
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const { unified } = await import('unified')
  const { default: remarkParse } = await import('remark-parse')
  const { default: remarkGfm } = await import('remark-gfm')
  const { default: remarkFrontmatter } = await import('remark-frontmatter')
  const { default: remarkHtml } = await import('remark-html')
  const DOMPurify = (await import('dompurify')).default

  // Strip frontmatter before rendering
  const content = markdown.replace(/^---[\s\S]*?---\n/, '')

  // Pre-process Obsidian extensions before remark.
  // All user-controlled captured groups are HTML-entity-encoded before injection.
  const preprocessed = content
    // ==highlight== → <mark>highlight</mark>
    .replace(/==([^=]+)==/g, (_, text) => `<mark>${escHtml(text)}</mark>`)
    // [[wikilink|alias]] → <a class="internal-link" data-href="...">alias</a>
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, target, alias) =>
      `<a class="internal-link" data-href="${escHtml(target)}">${escHtml(alias)}</a>`)
    // [[wikilink]] → <a class="internal-link" data-href="...">wikilink</a>
    .replace(/\[\[([^\]]+)\]\]/g, (_, target) =>
      `<a class="internal-link" data-href="${escHtml(target)}">${escHtml(target)}</a>`)
    // ![[embed]] → placeholder div
    .replace(/!\[\[([^\]]+)\]\]/g, (_, target) =>
      `<div class="embed-placeholder" data-embed="${escHtml(target)}">📎 ${escHtml(target)}</div>`)
    // Callouts: > [!type] title
    .replace(/^> \[!(\w+)\](?: (.+))?$/gm, (_, type, title) => {
      const t = escHtml((title ?? type).trim())
      return `> **[!${escHtml(type)}] ${t}**`
    })

  const result = await unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .use(remarkHtml as any, { sanitize: false })
    .process(preprocessed)

  // Sanitize HTML output, allowing only our custom classes/attributes
  const dirty = String(result)
  const clean = DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['data-href', 'data-embed'],
    ADD_TAGS: ['mark'],
  })

  return clean
}
