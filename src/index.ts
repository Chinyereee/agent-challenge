/**
 * ORACLE Agent — Node.js Bootstrap
 *
 * Starts a minimal HTTP health-check server on port 3000 immediately,
 * then boots ElizaOS AgentServer in the background. Once AgentServer is
 * ready it takes over the port. This keeps Nosana's health checks happy
 * during the 15-45s ElizaOS boot window.
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AgentServer } from "@elizaos/server";
import oracleSolanaPlugin from "./plugin-solana-intel/index.js";

const port = parseInt(process.env.SERVER_PORT ?? "3000", 10);
const bootStart = Date.now();

// ── Step 1: Instant health-check server ──────────────────────────────────────
// Responds to /health and all other requests immediately so Nosana/Docker
// considers the container healthy while ElizaOS is still loading.
const preBootServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "starting", agent: "ORACLE", uptime: process.uptime() }));
});

await new Promise<void>((ok) => preBootServer.listen(port, ok));
console.log(`⚡ Health check live on :${port} — ElizaOS loading...`);

// ── Step 2: Load character ────────────────────────────────────────────────────
const character = JSON.parse(
  readFileSync(resolve(process.cwd(), "character.json"), "utf-8")
);

// ── Step 3: Release port so AgentServer can bind ──────────────────────────────
await new Promise<void>((ok, fail) =>
  preBootServer.close((err) => (err ? fail(err) : ok()))
);

// ── Step 4: Full ElizaOS boot ─────────────────────────────────────────────────
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

console.log(`✅ ORACLE ready on http://localhost:${port} (boot: ${Date.now() - bootStart}ms)`);
