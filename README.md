# ORACLE — Personal Web3 Intelligence Agent

**O**n-chain **R**esearch & **A**nalysis **C**ognitive **L**ayer **E**ngine

Built on [ElizaOS v2](https://github.com/elizaos/eliza) · Deployed on [Nosana](https://nosana.io) · Powered by Qwen3-27B

---

## What Is ORACLE?

ORACLE is a personal AI agent that runs 24/7 on Nosana's decentralised GPU network, giving you:

- **Deep DeFi research** — audit any Solana protocol in seconds
- **Wallet intelligence** — on-chain position and liquidation analysis
- **Structured briefs** — executive-level summaries with source citations
- **Real-time alerts** — Telegram notifications for protocol risks
- **Content pipeline** — draft threads, reports, and governance posts

No OpenAI. No Google. Your agent, your data, your stack.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 23+ | `nvm install 23` |
| pnpm | 9+ | `npm i -g pnpm` |
| Docker | 24+ | [docker.com](https://docker.com) |
| Nosana CLI | latest | `npm i -g @nosana/cli` |
| Solana wallet | — | [Phantom](https://phantom.app) or `solana-keygen` |

---

## Quick Start

### 1 — Clone and Install

```bash
git clone https://github.com/your-org/oracle-agent.git
cd oracle-agent
pnpm install
pnpm build
```

### 2 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your keys:

```bash
# LLM — Nosana-hosted Qwen3 (no OpenAI account needed)
OPENAI_API_KEY=nosana
OPENAI_API_URL=https://inference.nosana.io/v1
SMALL_OPENAI_MODEL=Qwen/Qwen2.5-72B-Instruct-AWQ
LARGE_OPENAI_MODEL=Qwen/Qwen2.5-72B-Instruct-AWQ

# Optional: Telegram bot for alerts
TELEGRAM_BOT_TOKEN=your_token

# Optional: Helius for live on-chain data
HELIUS_API_KEY=your_key

# Optional: CoinMarketCap for prices
CMC_API_KEY=your_key
```

> **Never commit `.env` to git.** It's already in `.gitignore`.

### 3 — Run Locally

```bash
# Interactive terminal mode
pnpm start --characters="characters/character.json"

# Test the REST API
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{"userId":"me","text":"Research the Drift protocol"}'
```

### 4 — Deploy to Nosana

```bash
# Set up wallet
nos address   # copy your Solana address
# Fund with NOS tokens or claim hackathon credits from Nosana Discord

# Build and push Docker image
docker build -t your-dockerhub/oracle-agent:latest .
docker push your-dockerhub/oracle-agent:latest

# Update image name in nosana-job.json, then deploy
nos job post --file nosana-job.json \
  --market 97G9NnvBDQ2WpKu6fasoMsAKmfj63C9rhysJnkeWodAf

# Monitor
nos job get <JOB_ID>
nos job logs <JOB_ID> --follow
```

---

## Architecture

```
Your Laptop / Telegram
        │
        ▼
  ElizaOS v2 Runtime  ◄─── character.json (persona + plugins)
        │
   ┌────┴────┐
   │ Plugins  │
   │─────────│
   │bootstrap│   ◄── core message loop, memory, evaluators
   │node     │   ◄── file I/O, REST server
   │web-search│  ◄── DuckDuckGo / SerpAPI
   │solana   │   ◄── RPC, wallet, SPL tokens
   │coinmktcp│   ◄── price feeds
   │telegram │   ◄── bot client + alerts
   │solana-  │   ◄── ORACLE custom plugin (this repo)
   │intel    │
   └────┬────┘
        │
        ▼
  Nosana GPU Job  ──►  inference.nosana.io/v1
                             │
                        Qwen3-27B AWQ-4bit
                      (60k token context)
```

---

## Plugin: @oracle/plugin-solana-intel

Custom ElizaOS plugin in `src/plugin-solana-intel/index.ts`.

| Action | Trigger | Description |
|--------|---------|-------------|
| `RESEARCH_PROTOCOL` | "research [protocol]" | Full protocol risk brief |
| `ANALYZE_WALLET` | Solana address in message | Wallet holdings + liquidation risk |
| `GENERATE_BRIEF` | "generate brief / report" | Structured brief from conversation context |

### Adding a New Action

```typescript
import { Action } from "@elizaos/core";

const myAction: Action = {
  name: "MY_ACTION",
  similes: ["MY_ACTION_ALIAS"],
  description: "What this action does",
  validate: async (runtime, message) => {
    // Return true when this action should fire
    return message.content.text?.includes("trigger keyword");
  },
  handler: async (runtime, message, state, options, callback) => {
    const result = await runtime.generateText({ context: "..." });
    if (callback) callback({ text: result });
    return true;
  },
  examples: [[
    { user: "user", content: { text: "trigger" } },
    { user: "ORACLE", content: { text: "response" } }
  ]]
};
```

---

## File Structure

```
oracle-agent/
├── character.json              # ElizaOS v2 character definition
├── Dockerfile                  # Multi-stage production container
├── nosana-job.json             # Nosana deployment spec
├── .env.example                # Environment template
├── src/
│   └── plugin-solana-intel/
│       └── index.ts            # Custom ElizaOS plugin + actions
├── packages/                   # Cloned from elizaos/eliza monorepo
│   ├── core/
│   ├── cli/
│   └── plugin-*/
└── README.md
```

---

## Troubleshooting

**LLM not responding**
```bash
curl https://inference.nosana.io/v1/models -H "Authorization: Bearer nosana"
# Should list Qwen models
```

**pnpm install fails**
```bash
nvm use 23
pnpm store prune
rm -rf node_modules
pnpm install
```

**Nosana job pending too long**
```bash
nos balance                    # check NOS balance
nos market get 97G9NnvBDQ2WpKu6fasoMsAKmfj63C9rhysJnkeWodAf
# Get free credits: discord.gg/nosana
```

---

## Licence

MIT — Your agent, your rules.

---

*Built for the ElizaOS × Nosana hackathon. Part of the OpenClaw movement.*
