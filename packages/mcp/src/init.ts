import path from "node:path";
import readline from "node:readline";
import { type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAINS, DEFAULT_NETWORK } from "./chains.js";
import { prompt } from "./utils/prompt.js";
import {
  SERVER_NAME,
  buildEnv,
  buildServerEntry,
  claudeConfigPath,
  mergeJsonFile,
} from "./utils/mcpConfig.js";
import { resolveViewerKey } from "./utils/viewerKey.js";

type Client = "vscode" | "claude" | "cursor";

export async function runInit(args: string[]) {
  const clientArg = args.find((a) => a.startsWith("--client="))?.split("=")[1];
  const clientFlag = (() => {
    const i = args.indexOf("--client");
    return i !== -1 ? args[i + 1] : undefined;
  })();
  const client = (clientArg ?? clientFlag ?? "vscode") as Client;

  const networkArg = args.find((a) => a.startsWith("--network="))?.split("=")[1];
  const networkFlag = (() => {
    const i = args.indexOf("--network");
    return i !== -1 ? args[i + 1] : undefined;
  })();
  const network = networkArg ?? networkFlag ?? DEFAULT_NETWORK;

  if (!CHAINS[network]) {
    const available = Object.keys(CHAINS).join(", ");
    console.error(`Unknown network "${network}". Available: ${available}`);
    process.exit(1);
  }

  const chain = CHAINS[network];
  console.log(`\nSKALE Privacy MCP — setup for ${client}`);
  console.log(`Network: ${chain.label} (${network})`);
  console.log(`RPC:     ${chain.rpcUrl}`);
  console.log(`Wrapper: ${chain.wrapperAddress}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const privateKey = (await prompt(rl, "Signer private key (0x...): ")).trim() as Hex;
  const walletAddress = privateKeyToAccount(privateKey).address;
  console.log(`Wallet: ${walletAddress}`);

  const viewerKey = await resolveViewerKey(rl, chain.rpcUrl, chain.wrapperAddress, privateKey);

  rl.close();

  const env = buildEnv(privateKey, viewerKey, network);

  if (client === "vscode") {
    const filePath = path.join(process.cwd(), ".vscode", "mcp.json");
    mergeJsonFile(filePath, "servers", buildServerEntry(env, true));
  } else if (client === "claude") {
    const filePath = claudeConfigPath();
    mergeJsonFile(filePath, "mcpServers", buildServerEntry(env));
  } else if (client === "cursor") {
    const config = { mcpServers: { [SERVER_NAME]: buildServerEntry(env) } };
    console.log("\nAdd to your Cursor MCP config:\n");
    console.log(JSON.stringify(config, null, 2));
  } else {
    console.error(`Unknown client "${client}". Use: vscode, claude, cursor`);
    process.exit(1);
  }

  console.log("\nDone! Restart your AI client to load the MCP server.\n");
}
