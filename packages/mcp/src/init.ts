import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import os from "node:os";
import { CHAINS, DEFAULT_NETWORK } from "./chains.js";

type Client = "vscode" | "claude" | "cursor";

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function buildEnv(privateKey: string, viewerKey: string | undefined, network: string) {
  const env: Record<string, string> = { SKALE_PRIVATE_KEY: privateKey };
  if (network !== DEFAULT_NETWORK) env.SKALE_NETWORK = network;
  if (viewerKey) env.VIEWER_PRIVATE_KEY = viewerKey;
  return env;
}

function vscodeConfig(env: Record<string, string>): string {
  return JSON.stringify(
    {
      servers: {
        "skale-privacy": {
          type: "stdio",
          command: "npx",
          args: ["@skalenetwork/privacy-mcp"],
          env,
        },
      },
    },
    null,
    2,
  );
}

function claudeConfig(env: Record<string, string>): string {
  return JSON.stringify(
    {
      mcpServers: {
        "skale-privacy": {
          command: "npx",
          args: ["@skalenetwork/privacy-mcp"],
          env,
        },
      },
    },
    null,
    2,
  );
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
      return path.join(
        process.env.APPDATA ?? os.homedir(),
        "Claude",
        "claude_desktop_config.json",
      );
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
    const dir = path.join(process.cwd(), ".vscode");
    const filePath = path.join(dir, "mcp.json");
    fs.mkdirSync(dir, { recursive: true });
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch {
        // overwrite if unparseable
      }
    }
    const servers = (existing.servers as Record<string, unknown>) ?? {};
    servers["skale-privacy"] = {
      type: "stdio",
      command: "npx",
      args: ["@skalenetwork/privacy-mcp"],
      env,
    };
    existing.servers = servers;
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + "\n");
    console.log(`\nWritten to ${filePath}`);
  } else if (client === "claude") {
    const filePath = claudeConfigPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch {
        // overwrite if unparseable
      }
    }
    const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {};
    mcpServers["skale-privacy"] = {
      command: "npx",
      args: ["@skalenetwork/privacy-mcp"],
      env,
    };
    existing.mcpServers = mcpServers;
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + "\n");
    console.log(`\nWritten to ${filePath}`);
  } else if (client === "cursor") {
    console.log("\nAdd to your Cursor MCP config:\n");
    console.log(claudeConfig(env));
  } else {
    console.error(`Unknown client "${client}". Use: vscode, claude, cursor`);
    process.exit(1);
  }

  console.log("\nDone! Restart your AI client to load the MCP server.\n");
}
