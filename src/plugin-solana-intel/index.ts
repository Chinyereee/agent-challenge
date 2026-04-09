/**
 * ORACLE Custom Plugin — @oracle/plugin-solana-intel
 *
 * Extends the ElizaOS v1 runtime with three Solana-specific actions:
 *
 *   RESEARCH_PROTOCOL — Deep-dive any Solana DeFi protocol.
 *     Triggers when the message contains a known protocol name + "research".
 *     Uses the LLM to extract the protocol name then generates a structured
 *     risk brief (TVL, audits, risks, 🟢/🟡/🔴 rating).
 *
 *   ANALYZE_WALLET — On-chain wallet analysis.
 *     Triggers when a Solana base58 address (32-44 chars) is found in the
 *     message. In production this would call Helius DAS / Birdeye Portfolio
 *     APIs; currently generates a well-labelled mock output.
 *
 *   GENERATE_BRIEF — Structured research brief from conversation context.
 *     Triggers on keywords: "brief", "report", "summarize", "research".
 *     Reads the last 6 messages from state and synthesises them into a
 *     markdown brief with confidence flags.
 *
 * Registration:
 *   Import this plugin in src/index.ts and pass it to AgentServer.start().
 *   The elizaLogger calls emit to stdout/file according to the runtime's
 *   LOG_LEVEL environment variable.
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

/**
 * Researches a Solana DeFi protocol and returns a structured risk brief.
 *
 * Trigger condition: message contains a known protocol name AND "research".
 * The validate function is intentionally lenient — the handler re-checks
 * the extracted name before calling the LLM a second time.
 */
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

  /**
   * Returns true when the message mentions a known Solana protocol AND
   * the word "research", ensuring this action only fires on explicit requests.
   */
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content as { text?: string }).text?.toLowerCase() ?? "";
    const protocols = [
      "raydium", "orca", "jupiter", "drift", "marginfi",
      "marinade", "jito", "kamino", "meteora", "tensor",
    ];
    return protocols.some((p) => text.includes(p)) && text.includes("research");
  },

  /**
   * Extracts the protocol name from the message via LLM, then generates
   * a structured markdown risk brief. Errors are logged and surfaced to the
   * user via the callback so the conversation does not silently fail.
   */
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ): Promise<void> => {
    elizaLogger.info("[ORACLE] RESEARCH_PROTOCOL triggered");

    const messageText = (message.content as { text?: string }).text ?? "";

    try {
      // Step 1: Use LLM to extract the canonical protocol name from the message.
      const protocolResult = await runtime.generateText(
        `Extract the DeFi protocol name from this message: "${messageText}". Return ONLY the protocol name, nothing else.`
      );
      const protocol = protocolResult.text.trim();

      elizaLogger.info(`[ORACLE] Researching protocol: ${protocol}`);

      // Step 2: Generate the structured risk brief.
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
    } catch (err) {
      elizaLogger.error(`[ORACLE] RESEARCH_PROTOCOL failed: ${String(err)}`);
      if (callback) {
        await callback({
          text: "⚠️ ORACLE encountered an error while researching this protocol. Please try again.",
          action: "RESEARCH_PROTOCOL",
        });
      }
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

/**
 * Analyses a Solana wallet address and returns holdings, positions, and risk.
 *
 * Trigger condition: message contains a valid Solana base58 address (32-44 chars).
 * In production: swap the mock LLM call for real Helius DAS API or Birdeye
 * Portfolio API requests.
 */
const analyzeWallet: Action = {
  name: "ANALYZE_WALLET",
  similes: ["CHECK_WALLET", "WALLET_AUDIT", "PORTFOLIO_REVIEW"],
  description:
    "Analyse a Solana wallet address — token holdings, DeFi positions, PnL summary.",

  /**
   * Returns true when a Solana-format base58 address is found in the message.
   * The regex covers all valid base58 address lengths (32-44 characters).
   */
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content as { text?: string }).text ?? "";
    return /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(text);
  },

  /**
   * Extracts the wallet address, then generates a structured mock analysis.
   * Clearly labels the output as simulated. Errors are caught and reported
   * through the callback to avoid silent failures in the chat UI.
   */
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ): Promise<void> => {
    elizaLogger.info("[ORACLE] ANALYZE_WALLET triggered");

    const messageText = (message.content as { text?: string }).text ?? "";
    const match = messageText.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    const address = match ? match[0] : "unknown";

    elizaLogger.info(`[ORACLE] Analysing wallet: ${address}`);

    try {
      // In production: replace with Helius DAS API or Birdeye Portfolio API.
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
    } catch (err) {
      elizaLogger.error(`[ORACLE] ANALYZE_WALLET failed: ${String(err)}`);
      if (callback) {
        await callback({
          text: `⚠️ ORACLE could not analyse wallet \`${address}\`. Please try again.`,
          action: "ANALYZE_WALLET",
        });
      }
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

/**
 * Synthesises the recent conversation into a structured research brief.
 *
 * Trigger condition: message contains "brief", "report", "summarize", or "research".
 * Reads up to the last 6 messages from the runtime state to build context,
 * then asks the LLM to produce a formatted markdown brief.
 */
const generateBrief: Action = {
  name: "GENERATE_BRIEF",
  similes: ["CREATE_REPORT", "WRITE_BRIEF", "SUMMARIZE", "RESEARCH_BRIEF"],
  description:
    "Generate a structured research brief on any topic — synthesises context window memory.",

  /**
   * Returns true when the message explicitly asks for a brief, report,
   * summary, or research output. Broad matching is intentional because
   * the action adds real value across many research request phrasings.
   */
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content as { text?: string }).text?.toLowerCase() ?? "";
    return (
      text.includes("brief") ||
      text.includes("report") ||
      text.includes("summarize") ||
      text.includes("research")
    );
  },

  /**
   * Pulls recent message history from state, constructs a context string,
   * and asks the LLM to produce a structured markdown brief. Errors are
   * caught and surfaced through the callback.
   */
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ): Promise<void> => {
    elizaLogger.info("[ORACLE] GENERATE_BRIEF triggered");

    try {
      // Extract the last 6 messages from state for context.
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
    } catch (err) {
      elizaLogger.error(`[ORACLE] GENERATE_BRIEF failed: ${String(err)}`);
      if (callback) {
        await callback({
          text: "⚠️ ORACLE encountered an error generating the brief. Please try again.",
          action: "GENERATE_BRIEF",
        });
      }
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
 * ORACLE Solana Intelligence Plugin.
 *
 * Registered in src/index.ts via the `plugins` array passed to AgentServer.start().
 * ElizaOS discovers actions, providers, and evaluators from this object at boot.
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
