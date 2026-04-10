/**
 * ORACLE Agent — Entry Point
 *
 * Boot sequence:
 *   1. Bind a minimal HTTP server on the target port immediately so
 *      Nosana/Docker health checks pass during the 15-45 s ElizaOS init window.
 *   2. Parse character.json from disk.
 *   3. Shut down the pre-boot server to free the port.
 *   4. Start the full ElizaOS AgentServer, which takes over the port.
 *   5. Register a static-file middleware for the custom ORACLE frontend (public/).
 *
 * Why the pre-boot server is needed:
 *   ElizaOS initialises its database, loads plugins, compiles prompts, and
 *   negotiates with the LLM endpoint before it starts listening on any port.
 *   Without this server, Docker/Nosana marks the container unhealthy and
 *   restarts it before ElizaOS ever finishes booting.
 *
 * Custom frontend (public/index.html):
 *   A single-file chat UI served at GET /. It talks to the ElizaOS REST API
 *   at /api/agents/:id/message. We mount it via AgentServer.registerMiddleware()
 *   which inserts a handler into the Express pipeline before ElizaOS's wildcard
 *   routes, without needing a separate express import (avoiding v4/v5 conflicts).
 *
 * Known ElizaOS UI quirk — "answers before questions":
 *   The ElizaOS web UI sometimes renders the agent's response above the
 *   triggering user message. This is a message-ordering issue inside
 *   @elizaos/client and does not affect agent logic or REST API responses.
 *   It cannot be fixed at the agent-bootstrap level.
 *
 * Environment variables (all optional):
 *   SERVER_PORT          — HTTP port (default: 3000)
 *   DATABASE_URL         — e.g. sqlite:./data/oracle.sqlite (default: pglite)
 *   NODE_ENV             — set to "production" in Docker image
 */

import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentServer } from "@elizaos/server";
import type { Character } from "@elizaos/core";
import oracleSolanaPlugin from "./plugin-solana-intel/index.js";

/** Resolve __dirname equivalent in ESM. */
const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** Absolute path to the public/ directory (one level up from dist/). */
const publicDir = join(__dirname, "..", "public");

/** MIME types for files that may be served from public/. */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

/** Port the agent (and pre-boot health server) will listen on. */
const port = parseInt(process.env.SERVER_PORT ?? "3000", 10);

/** Wall-clock start time used to calculate total boot duration. */
const bootStart = Date.now();

// ── Step 1: Instant health-check server ──────────────────────────────────────
// Responds to ALL requests (including /health) immediately — before ElizaOS
// has initialised — so Nosana and Docker consider the container alive.
const preBootServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "starting",
      agent: "ORACLE",
      uptime: process.uptime(),
    })
  );
});

// Bind the pre-boot server and wait until the port is actually open.
await new Promise<void>((ok) => preBootServer.listen(port, ok));
console.log(`⚡ Health check live on :${port} — ElizaOS loading...`);

// ── Step 2: Load character definition ────────────────────────────────────────
// character.json defines the agent's persona, system prompt, plugins, and
// example conversations. It is read once at startup; changes require a restart.
let character: Character;
try {
  character = JSON.parse(
    readFileSync(resolve(process.cwd(), "character.json"), "utf-8")
  ) as Character;
} catch (err) {
  console.error("❌ Failed to read character.json:", err);
  process.exit(1);
}

// ── Step 3: Release port so AgentServer can bind ──────────────────────────────
// The pre-boot server must be closed before AgentServer.start() is called,
// otherwise AgentServer will fail with EADDRINUSE.
await new Promise<void>((ok, fail) =>
  preBootServer.close((err) => (err ? fail(err) : ok()))
);

// ── Step 4: Full ElizaOS boot ─────────────────────────────────────────────────
// AgentServer initialises the database, registers plugins, and starts the
// HTTP + WebSocket server on the same port released in step 3.
const agentServer = new AgentServer();

await agentServer
  .start({
    port,
    agents: [{ character, plugins: [oracleSolanaPlugin] }],
    dataDir: "./data",
  })
  .catch((err: unknown) => {
    console.error("❌ Failed to start ORACLE agent:", err);
    process.exit(1);
  });

// ── Step 5: Mount custom frontend via registerMiddleware ──────────────────────
// registerMiddleware inserts a function into AgentServer's Express pipeline.
// We handle two cases:
//   GET /         → serve public/index.html  (the ORACLE chat UI)
//   GET /foo.css  → serve any file in public/ by name
// All other paths (e.g. /api/*) pass through to ElizaOS handlers via next().
agentServer.registerMiddleware((req: any, res: any, next: any) => {
  const urlPath: string = (req.url ?? "/").split("?")[0];

  // Resolve to a file path; map root to index.html
  const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");

  // Reject any path traversal attempts
  if (relative.includes("..")) { next(); return; }

  const filePath = join(publicDir, relative);

  // Only serve files that actually exist in public/
  if (!existsSync(filePath) || !statSync(filePath).isFile()) { next(); return; }

  const mimeType = MIME[extname(filePath)] ?? "application/octet-stream";
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "no-cache");
  createReadStream(filePath).pipe(res);
});

console.log(
  `✅ ORACLE ready on http://localhost:${port} (boot: ${Date.now() - bootStart}ms)`
);
console.log(`🌐 Custom frontend: http://localhost:${port}/`);
