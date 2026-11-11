export default defineEventHandler(async (event) => {
  const { messages } = await readBody(event);

  const token = await getToken();

  const upstream = await fetch("https://api.giga.chat/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "GigaChat-2",
      messages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    throw createError({
      statusCode: upstream.status || 502,
      statusMessage: `GigaChat error: ${upstream.status}`,
      data: detail,
    });
  }

  setHeader(event, "content-type", "text/event-stream");
  setHeader(event, "cache-control", "no-cache");
  setHeader(event, "connection", "keep-alive");
  setHeader(event, "x-accel-buffering", "no");

  return upstream.body;
});
