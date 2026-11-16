export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatDelta {
  role?: 'assistant'
  content?: string | null
}

export interface ChatChoice {
  index: number
  delta: ChatDelta
  finish_reason: 'stop' | 'length' | 'tool_calls' | null
}

export interface ChatCompletionChunk {
  id?: string
  object?: 'chat.completion.chunk'
  created?: number
  model?: string
  choices: ChatChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  } | null
}

export interface GigaErrorChunk {
  message: string
  code?: number
  status?: number
}

export type ChatChunk = ChatCompletionChunk | GigaErrorChunk
