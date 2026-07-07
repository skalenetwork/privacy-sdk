import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./index.js";
import { runInit } from "./init.js";

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "init") {
    await runInit(args.slice(1));
    return;
  }

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
