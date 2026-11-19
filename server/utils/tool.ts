import { getCurrentDatetime } from './tools/current-datetime'
import { searchDocs } from './tools/search-docs'
import type { Tool } from './tools/types'

export { getCurrentDatetime, searchDocs }

export const TOOLS: Record<string, Tool> = {
  get_current_datetime: getCurrentDatetime,
  search_docs: searchDocs,
}

export const TOOL_DEFINITIONS = Object.values(TOOLS).map((t) => t.definition)
