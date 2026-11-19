import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const url = "http://127.0.0.1:3000";
let server;

async function isReady() {
  try { return (await fetch(url, { signal: AbortSignal.timeout(1000) })).ok; }
  catch { return false; }
}

if (!(await isReady())) {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"], { stdio: "ignore" });
  for (let i = 0; i < 120 && !(await isReady()); i++) await delay(500);
  if (!(await isReady())) throw new Error("Next.js did not start on port 3000");
}

try {
  const args = ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)];
  const tests = spawn(process.execPath, args, { stdio: "inherit" });
  const code = await new Promise((resolve) => tests.on("exit", resolve));
  process.exitCode = code ?? 1;
} finally {
  if (server) {
    if (process.platform === "win32") {
      const stopper = spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      stopper.unref();
    } else server.kill("SIGTERM");
  }
}

process.exit(process.exitCode ?? 0);
