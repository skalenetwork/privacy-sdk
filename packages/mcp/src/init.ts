import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import os from "node:os";
import {
  createWalletClient,
  http,
  isAddressEqual,
  zeroAddress,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ConfidentialToken,
  viewerPublicKey,
  deriveViewerKeypair,
} from "@skalenetwork/privacy-sdk";
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

function mergeJsonFile(filePath: string, rootKey: string, entry: Record<string, unknown>): void {
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

function buildServerEntry(
  env: Record<string, string>,
  includeType = false,
): Record<string, unknown> {
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

function makeToken(rpcUrl: string, wrapperAddress: Hex, signerKey: Hex): ConfidentialToken {
  const account = privateKeyToAccount(signerKey);
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) });
  return new ConfidentialToken({
    rpcUrl,
    address: wrapperAddress,
    signer: {
      address: account.address,
      sendTransaction: (tx) => walletClient.sendTransaction({ ...tx, chain: null }),
    },
  });
}

async function resolveViewerKey(
  rl: readline.Interface,
  rpcUrl: string,
  wrapperAddress: Hex,
  signerKey: Hex,
): Promise<string | undefined> {
  console.log("\nChecking viewer key registration...");
  const token = makeToken(rpcUrl, wrapperAddress, signerKey);
  const registeredViewer = await token.viewerAddress();
  const hasViewer = !isAddressEqual(registeredViewer, zeroAddress);

  if (hasViewer) {
    console.log(`Viewer registered for this wallet: ${registeredViewer}`);
    const input = await prompt(
      rl,
      "Enter the corresponding viewer private key (0x..., press Enter to skip): ",
    );
    const viewerKey = input.trim();
    if (!viewerKey) return undefined;

    const derivedAddress = privateKeyToAccount(viewerKey as Hex).address;
    if (!isAddressEqual(derivedAddress, registeredViewer)) {
      console.warn("⚠ Viewer private key does not match the registered viewer address. Skipping.");
      return undefined;
    }
    return viewerKey;
  }

  // No viewer registered
  console.log("No viewer key registered for this wallet.");
  console.log("  [1] Enter a viewer private key");
  console.log("  [2] Generate one via wallet signature (deterministic)");
  console.log("  [3] Skip (balance decryption will not be available)");
  const choice = (await prompt(rl, "Choice [1/2/3]: ")).trim();

  if (choice === "1") {
    const input = (await prompt(rl, "Viewer private key (0x...): ")).trim() as Hex;
    const viewerPrivateKey = input;
    console.log("Registering viewer key on-chain...");
    await token.registerViewerPublicKey(viewerPublicKey(viewerPrivateKey));
    console.log("Viewer key registered.");
    return viewerPrivateKey;
  }

  if (choice === "2") {
    const walletClient = createWalletClient({
      account: privateKeyToAccount(signerKey),
      transport: http(rpcUrl),
    });
    const sig = await walletClient.signMessage({ message: "SKALE Privacy Viewer Key" });
    const { privateKey: viewerPrivateKey } = deriveViewerKeypair(sig);
    console.log("Registering viewer key on-chain...");
    await token.registerViewerPublicKey(viewerPublicKey(viewerPrivateKey));
    console.log("Viewer key registered.");
    return viewerPrivateKey;
  }

  console.log("Skipping viewer key.");
  return undefined;
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

  const privateKey = (await prompt(rl, "Signer private key (0x...): ")).trim() as Hex;
  const walletAddress = privateKeyToAccount(privateKey).address;
  console.log(`Wallet: ${walletAddress}`);

  const viewerKey = await resolveViewerKey(
    rl,
    chain.rpcUrl,
    chain.wrapperAddress,
    privateKey,
  );

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
