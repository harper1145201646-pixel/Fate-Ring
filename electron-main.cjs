const { app, BrowserWindow, session } = require("electron");
const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { extname, join, normalize } = require("node:path");

const root = __dirname;

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
    const body = await readJsonBody(request);
    const apiKey = process.env.DEEPSEEK_API_KEY || body.apiKey;
    if (!apiKey) {
      jsonResponse(response, 401, { error: "DeepSeek API Key 未配置。请用 DEEPSEEK_API_KEY 启动应用，或部署后端代理。" });
      return;
    }

    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: body.model || "deepseek-v4-flash",
        messages: body.messages || [],
        temperature: body.temperature ?? 0.72,
        max_tokens: body.max_tokens || 1800,
        stream: false,
        response_format: body.response_format || { type: "json_object" }
      })
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

function startAppServer() {
  const server = createServer(async (request, response) => {
    if (request.method === "POST" && request.url === "/api/deepseek") {
      await proxyDeepSeek(request, response);
      return;
    }
    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(request, response);
      return;
    }
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

async function createWindow() {
  const { url } = await startAppServer();
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#05020a",
    title: "The Fate Ring",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === "media");
  });

  await mainWindow.loadURL(url);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
