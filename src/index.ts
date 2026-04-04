/**
 * ORACLE Agent — Node.js Bootstrap
 *
 * Starts the ElizaOS AgentServer directly using Node.js (no bun required).
 * Compatible with node:23-slim on Linux and Windows.
 */

import { AgentServer } from "@elizaos/server";
import { readFileSync } from "fs";
import { resolve } from "path";
import oracleSolanaPlugin from "./plugin-solana-intel/index.js";

const characterPath = resolve(process.cwd(), "character.json");
const character = JSON.parse(readFileSync(characterPath, "utf-8"));

const port = parseInt(process.env.SERVER_PORT ?? "3000", 10);

console.log("🚀 Booting ORACLE agent...");
console.log(`📡 Port: ${port}`);

const server = new AgentServer();

server
  .start({
    port,
    agents: [
      {
        character,
        plugins: [oracleSolanaPlugin],
      },
    ],
    dataDir: "./data",
  })
  .then(() => {
    console.log(`✅ ORACLE agent running on http://localhost:${port}`);
  })
  .catch((err: unknown) => {
    console.error("❌ Failed to start ORACLE agent:", err);
    process.exit(1);
  });
