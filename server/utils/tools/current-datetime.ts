import type { Tool } from './types'

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
