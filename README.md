# ORACLE — Personal Web3 Intelligence Agent

**O**n-chain **R**esearch & **A**nalysis **C**ognitive **L**ayer **E**ngine

Built on [ElizaOS v1](https://github.com/elizaos/eliza) · Deployed on [Nosana](https://nosana.io) · Powered by OpenRouter (Qwen3-27B / any model)

---

## What Is ORACLE?

ORACLE is a personal AI agent that runs 24/7 on Nosana's decentralised GPU network, giving you:

- **Deep DeFi research** — audit any Solana protocol in seconds with risk ratings
- **Wallet intelligence** — on-chain position and liquidation analysis
- **Structured briefs** — executive-level summaries with source citations
- **Telegram notifications** — real-time alerts for protocol risks (optional)
- **Content pipeline** — draft threads, reports, and governance posts

No OpenAI. No Google. Your agent, your data, your stack.

---

## Architecture

```
You (Browser / Telegram)
        │
        ▼
┌──────────────────────────────────────┐
│   Pre-boot Health Server (instant)   │  ◄── responds in <100ms during startup
│   releases port after ElizaOS ready  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│              ElizaOS v1 AgentServer                   │
│                                                       │
│  GET /  ──►  public/index.html  (custom chat UI)     │
│                                                       │
│  character.json  ──►  persona, system prompt, style   │
│                                                       │
│  Plugins:                                             │
│    @elizaos/plugin-bootstrap  ◄── core message loop   │
│    @elizaos/plugin-openrouter ◄── LLM routing         │
│    @elizaos/plugin-telegram   ◄── bot + alerts        │
│    @oracle/plugin-solana-intel◄── custom actions      │
│       ├── RESEARCH_PROTOCOL                           │
│       ├── ANALYZE_WALLET                              │
│       └── GENERATE_BRIEF                             │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
            OpenRouter API (sk-or-v1-...)
                       │
               Qwen3-27B-Instruct
            (or any OpenRouter model)
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 23+ | `nvm install 23` or [nodejs.org](https://nodejs.org) |
| pnpm | 10+ | `npm i -g pnpm@10` |
| Docker Desktop | 24+ | [docker.com](https://docker.com) |
| Nosana CLI | latest | `npm i -g @nosana/cli` |
| OpenRouter account | — | [openrouter.ai](https://openrouter.ai) (free tier available) |

> **Windows users**: Run all commands in PowerShell or Git Bash. Bun is NOT required or used.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | **Yes** | Your OpenRouter API key (`sk-or-v1-...`) |
| `SERVER_PORT` | No | HTTP port (default: `3000`) |
| `DATABASE_URL` | No | DB backend (default: PGlite WASM; use `sqlite:./data/oracle.sqlite` for faster startup) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token for alert notifications |
| `LOG_LEVEL` | No | Logging verbosity: `error`, `warn`, `info`, `debug` (default: `info`) |
| `NODE_ENV` | No | Set to `production` in Docker (already baked into the Dockerfile) |
| `NODE_OPTIONS` | No | V8 flags — Dockerfile sets `--max-old-space-size=512` to cap RAM within Nosana limits |

---

## Quick Start

### 1 — Clone and Install

```bash
git clone https://github.com/Chinyereee/agent-challenge.git
cd agent-challenge
pnpm install
```

### 2 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Required — get a free key at https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional
TELEGRAM_BOT_TOKEN=your_token
DATABASE_URL=sqlite:./data/oracle.sqlite
```

> Never commit `.env` to git — it is already in `.gitignore`.

### 3 — Build and Run Locally

```bash
pnpm build
node dist/index.js
```

Open [http://localhost:3000](http://localhost:3000) — the custom ORACLE chat UI loads instantly.

ElizaOS takes 15-45 seconds to fully initialise. The chat UI shows a "Connecting…" status and
automatically polls until the agent is ready — no manual refresh needed.

### 4 — Test the REST API Directly

```bash
# Health check (responds immediately, even during boot)
curl http://localhost:3000/health

# Discover the agent ID
curl http://localhost:3000/api/agents

# Send a message (replace AGENT_ID with the id from the step above)
curl -X POST http://localhost:3000/api/agents/AGENT_ID/message \
  -H "Content-Type: application/json" \
  -d '{"text":"Research the Drift protocol","userId":"me","roomId":"oracle_me"}'
```

---

## Custom Frontend

The chat interface lives in `public/index.html` — a single self-contained HTML/CSS/JS file with
no build step required. It is served by the agent at `GET /` via a static-file middleware
registered on `AgentServer.app` after ElizaOS boots.

Features:
- Dark-mode ORACLE branding with gradient accents
- Markdown rendering (headers, bold, code blocks, lists, risk colour badges 🟢🟡🔴)
- Typing indicator while ORACLE generates a response
- Six starter prompts to get you going immediately
- Auto-polls `/api/agents` on load and enables the input once the agent is ready
- Works on mobile

---

## Docker Deployment

### Build and Push Image

```bash
docker build -t chinyereee/oracle-agent:latest .
docker push chinyereee/oracle-agent:latest
```

### Run Locally with Docker

```bash
docker run -p 3000:3000 \
  -e OPENROUTER_API_KEY=sk-or-v1-your-key \
  chinyereee/oracle-agent:latest
```

Open [http://localhost:3000](http://localhost:3000) to use the chat UI.

---

## Nosana Deployment

ORACLE runs on Nosana's decentralised GPU network using the job spec in `nosana-job.json`.

### Step 1 — Install Nosana CLI and Create Wallet

```bash
npm install -g @nosana/cli
nosana address          # prints your Solana wallet address
```

### Step 2 — Fund Your Wallet

- **Hackathon credits**: Join [discord.gg/nosana](https://discord.gg/nosana) and ask in `#agent-challenge` for free NOS tokens
- **Buy NOS**: Available on Raydium and Jupiter on Solana mainnet
- **Check balance**: `nosana balance`

### Step 3 — Set Your API Key in nosana-job.json

Edit `nosana-job.json` and replace `YOUR_OPENROUTER_API_KEY`:

```json
"env": {
  "OPENROUTER_API_KEY": "sk-or-v1-your-key-here",
  "SERVER_PORT": "3000",
  "NODE_ENV": "production",
  "DATABASE_URL": "sqlite:./data/oracle.sqlite"
}
```

### Step 4 — Deploy

```bash
nosana job post --file nosana-job.json \
  --market 97G9NnvBDQ2WpKu6fasoMsAKmfj63C9rhysJnkeWodAf
```

### Step 5 — Get the Live URL and Monitor

```bash
nosana job get <JOB_ID>
# The "expose" field contains your public URL, e.g.:
# https://<JOB_ID>.node.k8s.prd.nos.ci

nosana job logs <JOB_ID> --follow
```

Open the URL in your browser — the custom ORACLE chat UI loads at the root path `/`.

---

## Plugin API Reference

### @oracle/plugin-solana-intel

Custom ElizaOS plugin in [src/plugin-solana-intel/index.ts](src/plugin-solana-intel/index.ts).

#### Actions

| Action | Trigger | Description |
|--------|---------|-------------|
| `RESEARCH_PROTOCOL` | Message contains a protocol name + "research" | Full risk brief: TVL, audits, known risks, 🟢/🟡/🔴 rating |
| `ANALYZE_WALLET` | Message contains a Solana base58 address | Holdings, DeFi positions, liquidation risk |
| `GENERATE_BRIEF` | Message contains "brief", "report", "summarize", or "research" | Structured markdown brief from conversation context |

#### Supported Protocols (RESEARCH_PROTOCOL)

Raydium, Orca, Jupiter, Drift, Marginfi, Marinade, Jito, Kamino, Meteora, Tensor

#### Adding a Custom Action

```typescript
import { Action, elizaLogger } from "@elizaos/core";

const myAction: Action = {
  name: "MY_ACTION",
  similes: ["MY_ACTION_ALIAS"],
  description: "What this action does",

  validate: async (_runtime, message) => {
    const text = (message.content as { text?: string }).text ?? "";
    return text.includes("trigger keyword");
  },

  handler: async (runtime, _message, _state, _options, callback) => {
    elizaLogger.info("[ORACLE] MY_ACTION triggered");
    try {
      const result = await runtime.generateText("Your prompt here");
      if (callback) await callback({ text: result.text, action: "MY_ACTION" });
    } catch (err) {
      elizaLogger.error(`[ORACLE] MY_ACTION failed: ${String(err)}`);
      if (callback) await callback({ text: "⚠️ Error. Please try again.", action: "MY_ACTION" });
    }
  },

  examples: [[
    { name: "user", content: { text: "trigger keyword" } },
    { name: "ORACLE", content: { text: "response", action: "MY_ACTION" } }
  ]]
};
```

---

## File Structure

```
agent-challenge/
├── character.json              # ORACLE persona, system prompt, plugins
├── Dockerfile                  # Production container (Node.js 23 slim, no bun)
├── .dockerignore               # Excludes node_modules, .env, dist from build context
├── nosana-job.json             # Nosana deployment spec (CPU: 2000m, RAM: 4096MB)
├── .env.example                # Environment variable template
├── package.json                # Dependencies and npm scripts
├── tsconfig.json               # TypeScript config (ESNext, Bundler resolution)
├── pnpm-lock.yaml              # Locked dependency tree
├── public/
│   └── index.html              # Custom ORACLE chat UI (pure HTML/CSS/JS, no build step)
└── src/
    ├── index.ts                # Agent bootstrap: pre-boot server + ElizaOS + static serving
    └── plugin-solana-intel/
        └── index.ts            # Custom plugin: RESEARCH_PROTOCOL, ANALYZE_WALLET, GENERATE_BRIEF
```

---

## Known Issues & Solutions

### Agent takes 15-45 seconds to become responsive after boot

**Why**: ElizaOS initialises its database, loads plugins, and negotiates with the LLM endpoint before accepting messages.

**Fix**: The pre-boot HTTP server on port 3000 responds to health checks instantly, preventing Docker/Nosana from restarting the container. The custom chat UI auto-polls `/api/agents` and enables the message input once the agent registers — no page refresh needed.

### "Answers before questions" in ElizaOS's built-in web UI

**Why**: The ElizaOS default web UI (`@elizaos/client`) sometimes renders the agent's reply above the triggering user message. This is a message-ordering bug internal to that client package.

**Resolution**: ORACLE's custom frontend (`public/index.html`) replaces the built-in UI entirely. It appends messages in the correct order — user message first, then the agent reply — so this quirk does not occur in the ORACLE chat interface.

### Docker build times out fetching heavy packages (pdfjs-dist, @electric-sql/pglite)

**Why**: These are optional transitive dependencies pulled in by `@elizaos/*` packages. They are large (~10 MB each) and slow on constrained CI/build networks.

**Fix**: The Dockerfile runs `pnpm install --no-optional` to skip optional deps, and sets `NPM_CONFIG_FETCH_RETRIES=5` with extended timeouts so transitive downloads retry automatically.

### Nosana job stays in "pending" state

**Why**: Usually insufficient NOS balance or no available GPU worker in the market.

**Fix**:
```bash
nosana balance
nosana market get 97G9NnvBDQ2WpKu6fasoMsAKmfj63C9rhysJnkeWodAf
```
Get free credits in the Nosana Discord (`discord.gg/nosana`, `#agent-challenge` channel).

### pnpm install fails on Node.js < 23

```bash
nvm install 23 && nvm use 23
pnpm store prune
rm -rf node_modules
pnpm install
```

---

## Getting Free Nosana Credits

1. Join the Nosana Discord: [discord.gg/nosana](https://discord.gg/nosana)
2. Go to `#agent-challenge` or `#faucet`
3. Request hackathon NOS tokens — the team actively supports challenge participants
4. Follow [@nosana_ci](https://twitter.com/nosana_ci) on Twitter for airdrop announcements

---

## Licence

MIT — Your agent, your rules.

---

*Built for the ElizaOS × Nosana Agent Challenge. ORACLE — decentralised AI for on-chain intelligence.*
