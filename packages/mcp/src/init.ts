import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import os from "node:os";
import { CHAINS, DEFAULT_NETWORK } from "./chains.js";

type Client = "vscode" | "claude" | "cursor";

const SERVER_NAME = "programmable-privacy";
const PACKAGE_NAME = "@skalenetwork/privacy-mcp";

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function buildEnv(privateKey: string, viewerKey: string | undefined, network: string) {
  const env: Record<string, string> = { SKALE_PRIVATE_KEY: privateKey };
  if (network !== DEFAULT_NETWORK) env.SKALE_NETWORK = network;
  if (viewerKey) env.VIEWER_PRIVATE_KEY = viewerKey;
  return env;
}

function mergeJsonFile(
  filePath: string,
  rootKey: string,
  entry: Record<string, unknown>,
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      // overwrite if unparseable
    }
  }
  const section = (existing[rootKey] as Record<string, unknown>) ?? {};
  section[SERVER_NAME] = entry;
  existing[rootKey] = section;
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + "\n");
  console.log(`\nWritten to ${filePath}`);
}

function buildServerEntry(env: Record<string, string>, includeType = false): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    command: "npx",
    args: [PACKAGE_NAME],
    env,
  };
  if (includeType) entry.type = "stdio";
  return entry;
}

function claudeConfigPath(): string {
  switch (process.platform) {
    case "darwin":
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );
    case "win32":
      return path.join(process.env.APPDATA ?? os.homedir(), "Claude", "claude_desktop_config.json");
    default:
      return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
  }
}

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

  const privateKey = await prompt(rl, "Signer private key (0x...): ");
  const viewerRaw = await prompt(
    rl,
    "Viewer private key for balance decryption (0x..., press Enter to skip): ",
  );
  const viewerKey = viewerRaw.trim() || undefined;

  rl.close();

  const env = buildEnv(privateKey.trim(), viewerKey, network);

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
