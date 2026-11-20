import type { Tool } from './types'

// Заметки лежат в server/assets/docs и подключены как serverAssets nitro:
// они попадают в бандл (.output), поэтому чтение через useStorage('assets:server')
// работает и на serverless-платформах (Vercel и др.), где readFile от
// process.cwd() не видит исходных файлов проекта.
const DOCS_STORAGE = 'assets:server'
const DOCS_BASE_KEY = 'docs'
const FRAGMENT_MAX_LENGTH = 200
const DEFAULT_MAX_RESULTS = 5

interface DocFragment {
  file: string
  fragment: string
}

interface SearchOutcome {
  results: DocFragment[]
  errors: string[]
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// Обрезает строку до FRAGMENT_MAX_LENGTH, окно центрируется на первом совпадении
function makeFragment(line: string, matchIndex: number): string {
  if (line.length <= FRAGMENT_MAX_LENGTH) {
    return line.trim()
  }
  const start = Math.max(0, matchIndex - Math.floor(FRAGMENT_MAX_LENGTH / 2))
  return line.slice(start, start + FRAGMENT_MAX_LENGTH).trim()
}

// score = сколько слов запроса встретилось в строке; одно совпадение уже кандидат,
// строки с большим числом слов поднимаются выше при сортировке
function scoreLine(
  line: string,
  words: string[],
): { score: number; firstMatch: number } {
  const lower = line.toLowerCase()
  let score = 0
  let firstMatch = -1
  for (const word of words) {
    const index = lower.indexOf(word)
    if (index !== -1) {
      score += 1
      if (firstMatch === -1 || index < firstMatch) {
        firstMatch = index
      }
    }
  }
  return { score, firstMatch }
}

async function searchDocsFiles(
  query: string,
  maxResults: number,
): Promise<SearchOutcome> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const storage = useStorage(DOCS_STORAGE)
  const errors: string[] = []
  const candidates: (DocFragment & { score: number })[] = []

  let keys: string[]
  try {
    keys = (await storage.getKeys(DOCS_BASE_KEY)).filter((key) =>
      key.endsWith('.md'),
    )
  } catch (err) {
    return {
      results: [],
      errors: [`не удалось получить список заметок: ${errorMessage(err)}`],
    }
  }

  for (const key of keys) {
    // unstorage разделяет уровни ключей через ':', но на некоторых драйверах
    // встречается и '/', поэтому срезаем всё до последнего разделителя из обоих
    const file = key.split(/[:/]/).pop() ?? key

    let text: string
    try {
      const content = await storage.getItem(key)
      if (typeof content !== 'string') {
        errors.push(`${file}: файл недоступен`)
        continue
      }
      text = content
    } catch (err) {
      errors.push(`${file}: ошибка чтения — ${errorMessage(err)}`)
      continue
    }

    for (const line of text.split('\n')) {
      const { score, firstMatch } = scoreLine(line, words)
      if (score < 1) {
        continue
      }
      candidates.push({
        file,
        fragment: makeFragment(line, firstMatch),
        score,
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  return { results: candidates.slice(0, maxResults), errors }
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

    let outcome: SearchOutcome
    try {
      outcome = await searchDocsFiles(query, maxResults)
    } catch (err) {
      return `ошибка поиска по заметкам: ${errorMessage(err)}`
    }

    const lines = outcome.results.map(
      ({ file, fragment }) => `[${file}] ${fragment}`,
    )
    for (const err of outcome.errors) {
      lines.push(`ошибка: ${err}`)
    }

    if (lines.length === 0) {
      return 'ничего не найдено'
    }
    return lines.join('\n')
  },
}
