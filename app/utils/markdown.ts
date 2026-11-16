import DOMPurify from 'dompurify'
import { marked } from 'marked'

// На сервере dompurify отдаёт фабрику без методов, а сообщения существуют
// только на клиенте, поэтому санитизация и хуки живут под client-гардом.
if (import.meta.client) {
  // Ссылки из ответов модели открываем в новой вкладке с изоляцией контекста.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if ((node as Element).tagName !== 'A') return
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  })
}

export function renderMarkdown(text: string): string {
  const raw = marked.parse(text, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string

  return import.meta.client ? DOMPurify.sanitize(raw) : raw
}
