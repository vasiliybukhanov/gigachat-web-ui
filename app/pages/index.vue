<script setup lang="ts">
import type { ChatChunk, ChatMessage } from '~/types/chat'
import { isGigaError } from '~/utils/error'

const messages = ref<ChatMessage[]>([])
const input = ref('')
const isLoading = ref(false)
const messagesEl = ref<HTMLElement | null>(null)

let controller: AbortController | null = null

function scrollToBottom(force = false) {
  nextTick(() => {
    const el = messagesEl.value
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    if (force || distance < 120) el.scrollTop = el.scrollHeight
  })
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || isLoading.value) return

  input.value = ''
  messages.value.push({ role: 'user', content: text })

  const reply = reactive<ChatMessage>({ role: 'assistant', content: '' })
  messages.value.push(reply)

  isLoading.value = true
  controller = new AbortController()
  scrollToBottom(true)

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
      scrollToBottom()
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      let updated = false

      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') {
            finished = true
            continue
          }

          const chunk = parseChunk(data) as ChatChunk
          if (isGigaError(chunk)) {
            reply.content = chunk.message
            finished = true
            updated = true
            break
          }

          const delta = chunk?.choices?.[0]?.delta?.content
          if (delta) {
            reply.content += delta
            updated = true
          }
          if (chunk?.choices?.[0]?.finish_reason) finished = true
        }
      }

      if (updated) scrollToBottom()
    }
    if (!finished) reply.content += '\n\n⚠️ ответ оборвался, попробуйте ещё раз'
  } catch (e: unknown) {
    if (!isAbortError(e)) {
      reply.content += `\n\n⚠️ ${toErrorMessage(e)}`
    }
  } finally {
    isLoading.value = false
    controller = null
    scrollToBottom()
  }
}

function stop() {
  controller?.abort()
}
</script>

<template>
  <main class="chat">
    <div ref="messagesEl" class="messages">
      <div class="messages-inner">
        <p v-if="!messages.length" class="empty">
          Задайте вопрос — ответ будет появляться по мере генерации.
        </p>
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="message"
          :class="m.role"
        >
          <ChatMarkdown
            v-if="m.role === 'assistant'"
            :text="m.content"
            :streaming="isLoading && i === messages.length - 1"
          />
          <template v-else>{{ m.content }}</template>
        </div>
      </div>
    </div>

    <form class="composer" @submit.prevent="sendMessage">
      <div class="composer-inner">
        <div class="field">
          <input
            v-model="input"
            :disabled="isLoading"
            placeholder="Спросите о чём угодно…"
            autofocus
          />
          <button
            v-if="isLoading"
            type="button"
            class="icon stop"
            title="Остановить"
            aria-label="Остановить"
            @click="stop"
          >
            ■
          </button>
          <button
            v-else
            type="submit"
            class="icon send"
            :disabled="!input.trim()"
            title="Отправить"
            aria-label="Отправить"
          >
            ↑
          </button>
        </div>
      </div>
    </form>
  </main>
</template>

<style lang="css">
html,
body {
  margin: 0;
  min-height: 100%;
  overscroll-behavior: none;
}
body {
  background: #fff;
  color: #0d0d0d;
  font-family:
    'Segoe UI',
    system-ui,
    -apple-system,
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
}
</style>

<style lang="css" scoped>
.chat {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 16px 0 0;
  box-sizing: border-box;
}
.messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.messages-inner {
  max-width: 768px;
  min-height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 16px 12px;
  box-sizing: border-box;
}
.messages::-webkit-scrollbar {
  width: 8px;
}
.messages::-webkit-scrollbar-thumb {
  background: #d7dae2;
  border-radius: 4px;
}
.empty {
  color: #9aa0ae;
  margin: auto;
  text-align: center;
  font-size: 15px;
}
.message {
  max-width: 85%;
  padding: 10px 16px;
  border-radius: 18px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.55;
  font-size: 15px;
}
.message.user {
  align-self: flex-end;
  background: #eef0f4;
  border-bottom-right-radius: 6px;
}
.message.assistant {
  align-self: stretch;
  max-width: 100%;
  background: transparent;
  padding: 2px 4px;
  white-space: normal;
}
.composer {
  position: relative;
  flex-shrink: 0;
  padding: 8px 16px max(24px, env(safe-area-inset-bottom));
}
.composer::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 768px;
  height: 36px;
  background: linear-gradient(to top, #fff, rgba(255, 255, 255, 0));
  pointer-events: none;
}
.composer-inner {
  max-width: 768px;
  margin: 0 auto;
}
.field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 5px 5px 16px;
  background: #fff;
  border: 1px solid #dfe1e7;
  border-radius: 26px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  transition: border-color 0.15s ease;
}
.field:focus-within {
  border-color: #b6bac6;
}
.field input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: inherit;
}
.field input::placeholder {
  color: #9aa0ae;
}
.field input:disabled {
  opacity: 0.7;
}
.icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 15px;
  line-height: 1;
}
.icon:disabled {
  opacity: 0.35;
  cursor: default;
}
.send {
  background: #0d0d0d;
  color: #fff;
}
.stop {
  background: #f1f3f7;
  color: #0d0d0d;
  border: 1px solid #dfe1e7;
}
</style>
