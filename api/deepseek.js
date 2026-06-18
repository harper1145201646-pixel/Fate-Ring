function jsonResponse(response, status, payload) {
  response.status(status).json(payload);
}

function normalizeBody(body) {
  if (typeof body !== "string") return body || {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function pickDeepSeekPayload(rawBody = {}) {
  const body = normalizeBody(rawBody);
  return {
    model: body.model || "deepseek-chat",
    messages: Array.isArray(body.messages) ? body.messages : [],
    temperature: body.temperature ?? 0.72,
    max_tokens: body.max_tokens || 1800,
    stream: false,
    response_format: body.response_format || { type: "json_object" }
  };
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    jsonResponse(response, 200, {
      ok: true,
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
      model: "deepseek-chat"
    });
    return;
  }

  if (request.method !== "POST") {
    jsonResponse(response, 405, { error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    jsonResponse(response, 401, { error: "DeepSeek API Key 未配置" });
    return;
  }

  try {
    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(pickDeepSeekPayload(request.body))
    });

    const text = await upstream.text();
    response.status(upstream.status);
    response.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    response.send(text);
  } catch (error) {
    jsonResponse(response, 500, { error: error.message || "DeepSeek 代理请求失败" });
  }
}
