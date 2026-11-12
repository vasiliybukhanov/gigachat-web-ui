interface Delta {
  role?: string
  content?: string
}

interface ChatChunk {
  choices?: Array<{
    delta?: Delta
    finish_reason?: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
  }
}

export function parseChunk(data: string): ChatChunk | null {
  try {
    return JSON.parse(data) as ChatChunk
  } catch {
    return null
  }
}
