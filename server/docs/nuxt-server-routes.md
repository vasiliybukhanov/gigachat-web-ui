# Nuxt/Nitro: серверные роуты, utils, env, гигиена

## server/api — REST-эндпоинты

- Имя файла определяет маршрут и метод: `server/api/chat.post.ts` → POST /api/chat.
- Хендлер: `defineEventHandler(async (event) => {...})`.
- `readBody(event)` — тело запроса; валидация сразу после чтения (`messages` — массив, не пустой).
- `createError({ statusCode, message, data })` — ошибка до отправки заголовков → JSON-ответ со статусом.
- SSE-заголовки: `setHeader(event, 'content-type', 'text/event-stream')` + cache-control,
  connection: keep-alive, x-accel-buffering: no.
- Писать в ответ напрямую: `event.node.res.write(...)` / `event.node.res.end()`;
  хендлер тогда ничего не возвращает (return undefined) — h3 не пытается отдать свой ответ.
- Альтернатива `return upstream.body` — Nitro сам перекачивает ReadableStream:
  работает, но нет контроля ошибок, уборки и логов.

## server/utils и server/plugins — автоподхват

- Файлы из `server/utils` доступны по имени без import: `getToken.ts` → `getToken()`.
- `server/plugins` запускаются при старте (loop-lag.ts — монитор event loop; временный).

## env и запуск

- `.env` → `NUXT_GIGA_AUTH_KEY=...` (префикс NUXT_ — для серверных переменных Nuxt).
- Прод-запуск: `"start": "node --env-file=.env .output/server/index.mjs"` (Node 20+: --env-file).
- `captured-body.json` (дамп переписки) — добавить в `.gitignore` и удалить из репозитория.

## Типизация между клиентом и сервером

- Общие типы — в `types/chat.ts`: клиент импортирует через `~/types/chat`,
  сервер — относительным путём (`../../types/chat`).
- Дискриминированное объединение `ChatCompletionChunk | GigaErrorChunk` + type guard
  лучше одного интерфейса с опциональными полями: после гарда тип сужается,
  ветка ошибки — явная точка кода.
- Чужой API в типах: `as` доверяет нашей же схеме; строгость поля проверяется стендом,
  а не надеждой (например, `finish_reason` у GigaChat может отсутствовать в чанке).

## Методика дебага (проверено на этом проекте)

1. Изолированный стенд: `test-stream.mjs` — тот же API без Nuxt,
   `node --env-file=.env test-stream.mjs` + NODE_EXTRA_CA_CERTS.
2. Сначала смотри сырые данные (дамп запроса/ответа), потом формулируй вывод,
   потом меняй код. Диагностический код ([raw]-логи, дампы) — временный, после расследования убрать.
3. Порядок: изолированный скрипт → типы → интеграция. Не отлаживать всё сразу в UI.
4. Ограничение заголовков апстрим-запроса минимумом (Content-Type + Authorization) —
  результат расследования: проблема была не в заголовках.
