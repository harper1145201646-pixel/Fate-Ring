import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8765);

function loadLocalEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadLocalEnv();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function jsonResponse(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function proxyDeepSeek(request, response) {
  try {
    if (request.method === "GET") {
      jsonResponse(response, 200, {
        ok: true,
        configured: Boolean(process.env.DEEPSEEK_API_KEY),
        model: "deepseek-chat"
      });
      return;
    }

    const body = await readJsonBody(request);
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      jsonResponse(response, 401, { error: "DeepSeek API Key 未配置" });
      return;
    }

    const upstreamBody = {
      model: body.model || "deepseek-chat",
      messages: Array.isArray(body.messages) ? body.messages : [],
      temperature: body.temperature ?? 0.72,
      max_tokens: body.max_tokens || 1800,
      stream: false,
      response_format: body.response_format || { type: "json_object" }
    };

    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(upstreamBody)
    });

    const text = await upstream.text();
    response.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8"
    });
    response.end(text);
  } catch (error) {
    jsonResponse(response, 500, { error: error.message || "DeepSeek 代理请求失败" });
  }
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/tarot-fate-ring.html" : url.pathname);
  const filePath = normalize(join(root, pathname));

  if (!filePath.startsWith(normalize(root))) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if ((request.method === "GET" || request.method === "POST") && url.pathname === "/api/deepseek") {
    await proxyDeepSeek(request, response);
    return;
  }
  if (request.method === "GET" || request.method === "HEAD") {
    await serveStatic(request, response);
    return;
  }
  response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Method not allowed");
}).listen(port, "127.0.0.1", () => {
  console.log(`Tarot Fate Ring running at http://localhost:${port}/`);
});
