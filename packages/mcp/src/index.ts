import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendPaymentTool } from "./tools/sendPayment.js";
import { checkBalanceTool } from "./tools/checkBalance.js";
import { wrapTokensTool } from "./tools/wrapTokens.js";
import { unwrapTokensTool } from "./tools/unwrapTokens.js";
import { revealTransferTool } from "./tools/revealTransfer.js";
import { tokenInfoTool } from "./tools/tokenInfo.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "skale-privacy",
    version: "0.1.0",
  });

  sendPaymentTool(server);
  checkBalanceTool(server);
  wrapTokensTool(server);
  unwrapTokensTool(server);
  revealTransferTool(server);
  tokenInfoTool(server);

  return server;
}

export { createServer as default };
