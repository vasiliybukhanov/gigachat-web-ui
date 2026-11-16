export function parseChunk(data: string): ChatChunk | null {
  try {
    return JSON.parse(data) as ChatChunk
  } catch {
    return null
  }
}
