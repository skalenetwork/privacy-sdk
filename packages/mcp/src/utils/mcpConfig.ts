import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DEFAULT_NETWORK } from "../chains.js";

export const SERVER_NAME = "programmable-privacy";
const PACKAGE_NAME = "@skalenetwork/privacy-mcp";

export function buildEnv(privateKey: string, viewerKey: string | undefined, network: string) {
  const env: Record<string, string> = { SKALE_PRIVATE_KEY: privateKey };
  if (network !== DEFAULT_NETWORK) env.SKALE_NETWORK = network;
  if (viewerKey) env.VIEWER_PRIVATE_KEY = viewerKey;
  return env;
}

export function buildServerEntry(
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

export function claudeConfigPath(): string {
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

export function mergeJsonFile(
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
