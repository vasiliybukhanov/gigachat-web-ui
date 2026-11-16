import { GigaErrorChunk } from '~/types/chat'

export default defineEventHandler(async (event) => {
  const { messages } = await readBody(event)

  if (!Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, message: 'messages обязателен' })
  }

  const token = await getToken()

  const url = useRuntimeConfig().chatUrl

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: 'GigaChat-2',
      messages,
      stream: true,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    throw createError({
      statusCode: upstream.status || 502,
      statusMessage: `GigaChat error: ${upstream.status}`,
      data: detail,
    })
  }

  setHeader(event, 'content-type', 'text/event-stream')
  setHeader(event, 'cache-control', 'no-cache')
  setHeader(event, 'connection', 'keep-alive')
  setHeader(event, 'x-accel-buffering', 'no')

  const reader = upstream.body.getReader()
  let closed = false

  event.node.res.on('close', () => {
    closed = true
    void reader.cancel().catch(() => {})
  })

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      event.node.res.write(value)
    }
  } catch (err) {
    if (!closed) {
      console.error('[chat] stream failed:', err)
      const payload: GigaErrorChunk = {
        status: 502,
        message: 'Ошибка соединения с GigaChat',
      }
      event.node.res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }
  } finally {
    await reader.cancel().catch(() => {})
    if (!event.node.res.writableEnded) event.node.res.end()
  }
})
