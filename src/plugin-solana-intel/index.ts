/**
 * ORACLE Custom Plugin — ElizaOS v1
 *
 * Extends the base ElizaOS runtime with Solana-specific actions:
 *   - RESEARCH_PROTOCOL   : Deep-dive any DeFi protocol
 *   - ANALYZE_WALLET      : On-chain wallet analysis
 *   - GENERATE_BRIEF      : Structured research brief from context
 *
 * Usage: add "@oracle/plugin-solana-intel" to your character's plugins array.
 */

import {
  Action,
  HandlerCallback,
  HandlerOptions,
  IAgentRuntime,
  Memory,
  State,
  Plugin,
  elizaLogger,
} from "@elizaos/core";

// ─── Action: RESEARCH_PROTOCOL ───────────────────────────────────────────────

const researchProtocol: Action = {
  name: "RESEARCH_PROTOCOL",
  similes: [
    "ANALYZE_PROTOCOL",
    "CHECK_PROTOCOL",
    "INVESTIGATE_PROTOCOL",
    "DEEP_DIVE",
  ],
  description:
    "Research a Solana DeFi protocol — TVL, risks, audit history, team, tokenomics.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content as { text?: string }).text?.toLowerCase() ?? "";
    const protocols = [
      "raydium", "orca", "jupiter", "drift", "marginfi",
      "marinade", "jito", "kamino", "meteora", "tensor",
    ];
    return protocols.some((p) => text.includes(p)) && text.includes("research");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ) => {
    elizaLogger.info("[ORACLE] RESEARCH_PROTOCOL triggered");

    const messageText = (message.content as { text?: string }).text ?? "";

    // Extract protocol name from message via LLM
    const protocolResult = await runtime.generateText(
      `Extract the DeFi protocol name from this message: "${messageText}". Return ONLY the protocol name, nothing else.`
    );
    const protocol = protocolResult.text.trim();

    elizaLogger.info(`[ORACLE] Researching protocol: ${protocol}`);

    // Generate a structured risk brief
    const briefResult = await runtime.generateText(
      `You are an on-chain researcher. Generate a structured risk brief for the Solana DeFi protocol: ${protocol}

Include:
1. Protocol overview (1-2 sentences)
2. TVL and key metrics (note if data is approximate)
3. Known risks (smart contract, liquidity, centralisation)
4. Audit history (note if unknown)
5. Risk rating: 🟢 Low / 🟡 Medium / 🔴 High

Use markdown. Flag uncertainties with ⚠️. Always add: NFA, DYOR.`
    );

    if (callback) {
      await callback({ text: briefResult.text, action: "RESEARCH_PROTOCOL" });
    }
  },

  examples: [
    [
      {
        name: "user",
        content: { text: "Research the Drift protocol for me" },
      },
      {
        name: "ORACLE",
        content: {
          text: "🟡 **Drift Protocol Brief**\n\n**Overview**: Drift is a decentralised perpetuals exchange on Solana...",
          action: "RESEARCH_PROTOCOL",
        },
      },
    ],
  ],
};

// ─── Action: ANALYZE_WALLET ──────────────────────────────────────────────────

const analyzeWallet: Action = {
  name: "ANALYZE_WALLET",
  similes: ["CHECK_WALLET", "WALLET_AUDIT", "PORTFOLIO_REVIEW"],
  description:
    "Analyse a Solana wallet address — token holdings, DeFi positions, PnL summary.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content as { text?: string }).text ?? "";
    return /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ) => {
    elizaLogger.info("[ORACLE] ANALYZE_WALLET triggered");

    const messageText = (message.content as { text?: string }).text ?? "";
    const match = messageText.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    const address = match ? match[0] : "unknown";

    elizaLogger.info(`[ORACLE] Analysing wallet: ${address}`);

    // In production: call Helius DAS API or Birdeye Portfolio API
    const summaryResult = await runtime.generateText(
      `Generate a mock wallet analysis for Solana address: ${address}
Structure it as:
- SOL balance (approximate placeholder)
- Top token holdings (3-5 common Solana tokens)
- Active DeFi positions (1-2 example protocols)
- Liquidation risk assessment
- Overall risk: 🟢/🟡/🔴

Make clear this is a simulated output and in production would query Helius/Birdeye APIs.
Add ⚠️ wherever data would need real API verification. NFA, DYOR.`
    );

    if (callback) {
      await callback({ text: summaryResult.text, action: "ANALYZE_WALLET" });
    }
  },

  examples: [
    [
      {
        name: "user",
        content: { text: "Analyze this wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" },
      },
      {
        name: "ORACLE",
        content: {
          text: "🟡 **Wallet Analysis**\n\n**Address**: 7xKXtg2...gsAsU\n**SOL Balance**: ~42 SOL...",
          action: "ANALYZE_WALLET",
        },
      },
    ],
  ],
};

// ─── Action: GENERATE_BRIEF ──────────────────────────────────────────────────

const generateBrief: Action = {
  name: "GENERATE_BRIEF",
  similes: ["CREATE_REPORT", "WRITE_BRIEF", "SUMMARIZE", "RESEARCH_BRIEF"],
  description:
    "Generate a structured research brief on any topic — synthesises context window memory.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content as { text?: string }).text?.toLowerCase() ?? "";
    return (
      text.includes("brief") ||
      text.includes("report") ||
      text.includes("summarize") ||
      text.includes("research")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ) => {
    elizaLogger.info("[ORACLE] GENERATE_BRIEF triggered");

    const recentMessages = (state as { recentMessagesData?: Memory[] } | undefined)
      ?.recentMessagesData;
    const recentContext = recentMessages
      ?.slice(-6)
      .map((m: Memory) => `user: ${(m.content as { text?: string }).text ?? ""}`)
      .join("\n") ?? "";

    const messageText = (message.content as { text?: string }).text ?? "";

    const briefResult = await runtime.generateText(
      `Based on the following conversation, generate a structured research brief:

${recentContext}

User request: ${messageText}

Brief structure:
# [Topic] — Research Brief
## Key Findings
## Risk Assessment
## Sources & Confidence
## Recommended Actions

Use markdown. Flag low-confidence data. Add NFA, DYOR where financial.`
    );

    if (callback) {
      await callback({ text: briefResult.text, action: "GENERATE_BRIEF" });
    }
  },

  examples: [
    [
      {
        name: "user",
        content: { text: "Generate a brief on everything we discussed" },
      },
      {
        name: "ORACLE",
        content: {
          text: "# Research Brief — Solana DeFi Landscape\n\n## Key Findings...",
          action: "GENERATE_BRIEF",
        },
      },
    ],
  ],
};

// ─── Plugin Export ────────────────────────────────────────────────────────────

/**
 * ORACLE Solana Intelligence Plugin
 * Auto-discovered by the ElizaOS CLI via src/index.ts export.
 */
const oracleSolanaPlugin: Plugin = {
  name: "@oracle/plugin-solana-intel",
  description:
    "ORACLE custom plugin — Solana DeFi research, wallet analysis, and intelligence briefs",
  actions: [researchProtocol, analyzeWallet, generateBrief],
  providers: [],
  evaluators: [],
};

export default oracleSolanaPlugin;
export { researchProtocol, analyzeWallet, generateBrief };
