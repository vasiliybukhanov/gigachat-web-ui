<script setup lang="ts">
interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([])
const input = ref('')
const isLoading = ref(false)

let controller: AbortController | null = null

async function sendMessage() {
  const text = input.value.trim()
  if (!text || isLoading.value) return

  input.value = ''
  messages.value.push({ role: 'user', content: text })

  const reply = reactive<Message>({ role: 'assistant', content: '' })
  messages.value.push(reply)

  isLoading.value = true
  controller = new AbortController()

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.value.filter((m) => m.content),
      }),
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      reply.content = `Ошибка ${res.status}: ${detail.slice(0, 300)}`
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue

          const chunk = parseChunk(data)
          const delta = chunk?.choices?.[0]?.delta?.content
          if (delta) reply.content += delta
        }
      }
    }
  } catch (e: unknown) {
    if (!isAbortError(e)) {
      reply.content += `\n\n⚠️ ${toErrorMessage(e)}`
    }
  } finally {
    isLoading.value = false
    controller = null
  }
}

function stop() {
  controller?.abort()
}
</script>

<template>
  <main class="chat">
    <h1>GigaChat</h1>

    <div class="messages">
      <p v-if="!messages.length" class="empty">
        Задайте вопрос - ответ будет появляться по мере генерации.
      </p>
      <div v-for="(m, i) in messages" :key="i" class="bubble" :class="m.role">
        {{ m.content }}
        <span
          v-if="
            m.role === 'assistant' && isLoading && i === messages.length - 1
          "
          class="cursor"
          >▍
        </span>
      </div>
    </div>

    <form class="composer" @submit.prevent="sendMessage">
      <input
        v-model="input"
        :disabled="isLoading"
        placeholder="Сообщение..."
        autofocus
      />
      <button v-if="isLoading" type="button" @click="stop">Стоп</button>
      <button v-else type="submit" :disabled="!input.trim()">Отправить</button>
    </form>
  </main>
</template>
