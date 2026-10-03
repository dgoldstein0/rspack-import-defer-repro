// Starts `rspack dev` (fresh, so lazy entries are not yet compiled), loads the page
// once in a headless browser, and reports uncaught errors / rendered output.
import { spawn } from "child_process";
import { chromium } from "playwright";

const PORT = 8080;
const server = spawn("pnpm", ["run", "dev:rspack", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

const kill = () => {
  try {
    process.kill(-server.pid);
  } catch {}
};

try {
  for (let i = 0; !/compiled/i.test(log); i++) {
    if (i > 300) throw new Error("dev server did not start:\n" + log);
    await new Promise((r) => setTimeout(r, 100));
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.stack || String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(3000);
  const result = await page.locator("#result").textContent({ timeout: 1000 }).catch(() => null);

  console.log("rendered:", result);
  console.log("errors:\n" + (errors.join("\n\n") || "(none)"));
  await browser.close();
  process.exitCode = errors.length || !result ? 1 : 0;
} finally {
  kill();
}
