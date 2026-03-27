/**
 * ORACLE Plugin Entry Point
 *
 * Exports the custom Solana intelligence plugin so the ElizaOS CLI
 * can auto-discover and register it when running:
 *   elizaos start --character ./character.json
 *
 * ElizaOS Plugin Docs: https://elizaos.github.io/eliza/docs/core/plugins
 */

export { default } from "./plugin-solana-intel/index.js";
export * from "./plugin-solana-intel/index.js";
