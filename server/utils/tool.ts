export interface Tool {
  definition: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
  execute: (args: Record<string, unknown>) => Promise<string>
}

export const getCurrentDatetime: Tool = {
  definition: {
    name: 'get_current_datetime',
    description: 'Возвращает текущие дату и время сервера в ISO 8601',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  async execute() {
    return new Date().toISOString()
  },
}

export const searchDocs: Tool = {
  definition: {
    name: 'search_docs',
    description:
      'Возвращает фрагменты текста с именами файлов. Вызывай, когда пользователь спрашивает про файлы. Не пересылай вопрос пользователя целиком',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Поисковый запрос по документам',
        },
        max_results: {
          type: 'integer',
          description: 'сколько совпадений вернуть; по умолчанию 5',
        },
      },
      required: ['query'],
    },
  },
  async execute() {
    return 'функция в разработке'
  },
}

export const TOOLS: Record<string, Tool> = {
  get_current_datetime: getCurrentDatetime,
  search_docs: searchDocs,
}
export const TOOL_DEFINITIONS = Object.values(TOOLS).map((t) => t.definition)
