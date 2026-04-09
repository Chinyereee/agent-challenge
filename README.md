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
┌───────────────────────────────────┐
│  Pre-boot Health Server (instant) │  ◄── responds in <100ms on startup
│  releases port → AgentServer      │
└─────────────┬─────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│              ElizaOS v1 AgentServer                  │
│                                                      │
│  character.json  ──►  persona, system prompt, style  │
│                                                      │
│  Plugins:                                            │
│    @elizaos/plugin-bootstrap  ◄── core message loop  │
│    @elizaos/plugin-openrouter ◄── LLM routing        │
│    @elizaos/plugin-telegram   ◄── bot + alerts       │
│    @oracle/plugin-solana-intel◄── custom actions     │
│       ├── RESEARCH_PROTOCOL                          │
│       ├── ANALYZE_WALLET                             │
│       └── GENERATE_BRIEF                            │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
           OpenRouter API / Nosana Inference
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

> **Windows users**: Run all commands in PowerShell or Git Bash. Bun is not required.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | **Yes** | Your OpenRouter API key (`sk-or-v1-...`) |
| `SERVER_PORT` | No | HTTP port (default: `3000`) |
| `DATABASE_URL` | No | DB path (default: PGlite WASM; set `sqlite:./data/oracle.sqlite` for faster startup) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token for alerts |
| `LOG_LEVEL` | No | Logging verbosity: `error`, `warn`, `info`, `debug` (default: `info`) |
| `NODE_ENV` | No | Set to `production` in Docker (already set in Dockerfile) |

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
OPENROUTER_API_KEY=sk-or-v1-your-key-here
# Optional
TELEGRAM_BOT_TOKEN=your_token
DATABASE_URL=sqlite:./data/oracle.sqlite
```

> Get a free OpenRouter key at [openrouter.ai/keys](https://openrouter.ai/keys).
> Never commit `.env` to git — it is in `.gitignore`.

### 3 — Build and Run Locally

```bash
pnpm build
node dist/index.js
```

Open [http://localhost:3000](http://localhost:3000) to chat with ORACLE.

### 4 — Test the API

```bash
# Health check
curl http://localhost:3000/health

# Send a message
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{"userId":"me","text":"Research the Drift protocol"}'
```

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

---

## Nosana Deployment

ORACLE runs on Nosana's decentralised GPU network using the job spec in `nosana-job.json`.

### Step 1 — Install Nosana CLI and Create Wallet

```bash
npm install -g @nosana/cli
nosana address          # creates a new wallet and prints your Solana address
```

### Step 2 — Fund Your Wallet

Options:
- **Hackathon credits**: Join [discord.gg/nosana](https://discord.gg/nosana) and ask in `#agent-challenge` for free NOS tokens
- **Buy NOS**: Available on Raydium and Jupiter on Solana
- **Testnet faucet**: `nosana faucet` (testnet only)

Check balance:
```bash
nosana balance
```

### Step 3 — Update nosana-job.json

Edit `nosana-job.json` and replace `YOUR_OPENROUTER_API_KEY` with your actual key:

```json
"env": {
  "OPENROUTER_API_KEY": "sk-or-v1-your-key-here"
}
```

### Step 4 — Deploy

```bash
nosana job post --file nosana-job.json \
  --market 97G9NnvBDQ2WpKu6fasoMsAKmfj63C9rhysJnkeWodAf
```

### Step 5 — Monitor

```bash
nosana job get <JOB_ID>
nosana job logs <JOB_ID> --follow
```

The deployment URL is shown in `nosana job get` output under `expose`.

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

  handler: async (runtime, message, _state, _options, callback) => {
    elizaLogger.info("[ORACLE] MY_ACTION triggered");
    try {
      const result = await runtime.generateText("Your prompt here");
      if (callback) await callback({ text: result.text, action: "MY_ACTION" });
    } catch (err) {
      elizaLogger.error("[ORACLE] MY_ACTION failed:", err);
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
├── Dockerfile                  # Production container (Node.js 23, no bun)
├── .dockerignore               # Excludes node_modules, .env, dist from build context
├── nosana-job.json             # Nosana deployment spec (CPU: 2000m, RAM: 4096MB)
├── .env.example                # Environment variable template
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config (ESNext, Bundler resolution)
├── pnpm-lock.yaml              # Locked dependency tree
└── src/
    ├── index.ts                # Agent bootstrap + pre-boot health server
    └── plugin-solana-intel/
        └── index.ts            # Custom actions: RESEARCH_PROTOCOL, ANALYZE_WALLET, GENERATE_BRIEF
```

---

## Known Issues & Solutions

### Agent takes 15-45 seconds to become responsive

**Why**: ElizaOS initialises its database, loads plugins, and negotiates with the LLM endpoint before accepting messages.

**Fix**: ORACLE includes a pre-boot HTTP server that responds to health checks instantly. You can chat once the page loads — messages sent during boot are queued and processed once ElizaOS is ready.

### "Answers before questions" UI quirk

**Why**: The ElizaOS web UI sometimes renders the agent's reply above the triggering user message. This is a message-ordering bug in `@elizaos/client` and does not affect the API or agent logic.

**Workaround**: Use the REST API directly (`/api/message`) for production integrations. The conversation order in the API response is always correct.

### Docker build times out on heavy packages (pdfjs-dist, @napi-rs/canvas)

**Why**: These are optional transitive dependencies pulled in by `@elizaos/*`.

**Fix**: The Dockerfile uses `pnpm install --no-optional` to skip them. The retry env vars (`NPM_CONFIG_FETCH_RETRIES=5`) handle intermittent registry timeouts.

### Nosana job stays in "pending" state

**Why**: Usually insufficient NOS balance or no available GPU nodes in the market.

**Fix**:
```bash
nosana balance          # check NOS + SOL balance
nosana market get 97G9NnvBDQ2WpKu6fasoMsAKmfj63C9rhysJnkeWodAf
# Get free credits in Nosana Discord: discord.gg/nosana
```

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
2. Go to the `#agent-challenge` or `#faucet` channel
3. Request hackathon credits — the team provides NOS tokens for challenge participants
4. Alternatively, follow [@nosana_ci](https://twitter.com/nosana_ci) on Twitter for airdrop announcements

---

## Licence

MIT — Your agent, your rules.

---

*Built for the ElizaOS × Nosana Agent Challenge. ORACLE — decentralised AI for on-chain intelligence.*
