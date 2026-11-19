import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Tool } from './types'

const DOCS_DIR = join(process.cwd(), 'server', 'data', 'docs')
const FRAGMENT_MAX_LENGTH = 200
const DEFAULT_MAX_RESULTS = 5

interface DocFragment {
  file: string
  fragment: string
}

// Обрезает строку до FRAGMENT_MAX_LENGTH, окно центрируется на вхождении запроса
function makeFragment(line: string, matchIndex: number): string {
  if (line.length <= FRAGMENT_MAX_LENGTH) {
    return line.trim()
  }
  const start = Math.max(0, matchIndex - Math.floor(FRAGMENT_MAX_LENGTH / 2))
  return line.slice(start, start + FRAGMENT_MAX_LENGTH).trim()
}

async function searchDocsFiles(
  query: string,
  maxResults: number,
): Promise<DocFragment[]> {
  const needle = query.toLowerCase()
  const entries = await readdir(DOCS_DIR, { withFileTypes: true })
  const mdFiles = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith('.md'),
  )

  const results: DocFragment[] = []

  for (const entry of mdFiles) {
    const text = await readFile(join(DOCS_DIR, entry.name), 'utf-8')

    for (const line of text.split('\n')) {
      const index = line.toLowerCase().indexOf(needle)
      if (index === -1) {
        continue
      }
      results.push({ file: entry.name, fragment: makeFragment(line, index) })
      if (results.length >= maxResults) {
        return results
      }
    }
  }

  return results
}

export const searchDocs: Tool = {
  definition: {
    name: 'search_docs',
    description:
      'Ищет по личным заметкам пользователя (markdown-конспекты) и возвращает фрагменты текста с именами файлов. Вызывай, когда ответ на вопрос может найтись в этих заметках: механика библиотек, API, настройки проекта.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Ключевые слова для поиска: 2–4 слова, без служебных слов и вопросительной формы. Например: «токен кеш», «finish_reason буфер». Не пересылай вопрос пользователя целиком.',
        },
        max_results: {
          type: 'integer',
          description: 'Сколько совпадений вернуть; по умолчанию 5.',
        },
      },
      required: ['query'],
    },
  },
  async execute(args) {
    const query = String(args.query ?? '').trim()
    const maxResults =
      typeof args.max_results === 'number' && args.max_results > 0
        ? Math.trunc(args.max_results)
        : DEFAULT_MAX_RESULTS

    if (!query) {
      return 'пустой запрос — нечего искать'
    }

    const found = await searchDocsFiles(query, maxResults)
    if (found.length === 0) {
      return 'ничего не найдено'
    }

    return found.map(({ file, fragment }) => `[${file}] ${fragment}`).join('\n')
  },
}
