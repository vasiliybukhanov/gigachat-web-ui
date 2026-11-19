# GigaChat: ключи, OAuth-токен, сертификаты

## Секреты

- API-ключ лежит в `.env` как `NUXT_GIGA_AUTH_KEY`. Префикс `NUXT_` — чтобы переменная
  попала в серверную часть Nuxt.
- Ключ никогда не выходит на клиент: OAuth и запросы к модели делает только Nitro-роут.

## OAuth: обмен ключа на access-токен

- `POST https://ngw.devices.sberbank.ru:9443/api/v2/oauth`
- Заголовки: `Authorization: Basic <NUXT_GIGA_AUTH_KEY>` и `RqUID: <uuid>` (id запроса).
- Тело: `{ "scope": "GIGACHAT_API_PERS" }` (личный тариф).
- Ответ: `{ "access_token": "...", "expires_at": <epoch ms> }`.
- Токен живёт ~30 минут → кешируем синглтоном в `server/utils/getToken.ts`
  до `expires_at − 2 мин`, после — тихо перекупаем. Клиент про OAuth не знает ничего.

## Сертификаты Минцифры

- Российские центры сертификации не входят в доверенные Node по умолчанию.
- `russian_cas.pem` — склейка root + sub сертификатов
  (PowerShell: `Get-Content ... | Set-Content -Encoding ascii`).
- Запуск: `NODE_EXTRA_CA_CERTS=./russian_cas.pem node .output/server/index.mjs`.
- Изолированный скрипт: `node --env-file=.env test-stream.mjs` + тот же `NODE_EXTRA_CA_CERTS`.

## Запрос к модели

- `POST https://gigachat.devices.sberbank.ru/api/v1/chat/completions`
- В апстрим-запросе достаточно двух заголовков: `Content-Type: application/json`
  и `Authorization: Bearer <access_token>` (проверено расследованием: лишние заголовки не нужны).
- Body: `{ model: 'GigaChat-2', messages: [...], stream: true }`.
- Все модели линейки поддерживают пользовательские функции
  (доки: «Все модели GigaChat поддерживают встроенные и пользовательские функции»).

## Ошибки API

- Плоский JSON без обёртки: `{"status": 400, "message": "..."}` или
  `{"code": 5, "message": "scope is empty"}` — числовой статус/код + строка `message`.
- Обе ошибки приходят и как HTTP-статус (до стрима), и потенциально внутри стрима.
- Источник истины: developers.sber.ru/docs/ru/gigachat/api/errors-description.

## Типизация чанков

- Дискриминированное объединение: `ChatCompletionChunk | GigaErrorChunk` + type guard
  `isGigaError` (`'message' in chunk && !('choices' in chunk)`).
- После гарда TS сужает тип: к `choices` можно обращаться без `?.`, ветка ошибки явная.
- `JSON.parse` возвращает any — `as ChatChunk` доверяет своей типизации (взрослая проверка — zod).
