import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { existsSync, readFileSync, writeFileSync, openSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const serverPath = join(projectRoot, "tarot-deepseek-server.mjs");
const runtimeDir = join(projectRoot, ".runtime");
const pidPath = join(runtimeDir, "tarot-web.pid");
const logPath = join(runtimeDir, "tarot-web.log");
const port = Number(process.env.PORT || 8765);
const command = process.argv[2] || "status";

function ensureRuntimeDir() {
  mkdirSync(runtimeDir, { recursive: true });
}

function readPid() {
  if (!existsSync(pidPath)) return null;
  const value = Number(readFileSync(pidPath, "utf8").trim());
  return Number.isFinite(value) ? value : null;
}

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === "EPERM";
  }
}

function isPortOpen() {
  return new Promise(resolve => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(650, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function status() {
  const pid = readPid();
  const alive = isProcessAlive(pid);
  const listening = await isPortOpen();
  console.log(JSON.stringify({
    pid,
    alive,
    listening,
    url: `http://localhost:${port}/`,
    log: logPath
  }));
  return listening;
}

async function start() {
  ensureRuntimeDir();
  if (await isPortOpen()) {
    await status();
    return;
  }

  const logFd = openSync(logPath, "a");
  const child = spawn(process.execPath, [serverPath], {
    cwd: projectRoot,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: { ...process.env, PORT: String(port) }
  });
  child.unref();
  writeFileSync(pidPath, String(child.pid));

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await isPortOpen()) {
      await status();
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 180));
  }
  console.error(`启动超时，请查看日志：${logPath}`);
  process.exit(1);
}

async function stop() {
  const pid = readPid();
  if (isProcessAlive(pid)) {
    process.kill(pid, "SIGTERM");
  }
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && isProcessAlive(pid)) {
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  await status();
}

if (command === "start") {
  await start();
} else if (command === "stop") {
  await stop();
} else {
  await status();
}
