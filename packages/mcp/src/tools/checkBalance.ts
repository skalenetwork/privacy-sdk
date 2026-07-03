import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createWrapper, getConfigFromEnv } from "../config.js";

export function checkBalanceTool(server: McpServer) {
  server.tool(
    "check_private_balance",
    "Decrypt and return the current confidential token balance for the configured wallet.",
    {},
    async () => {
      const config = getConfigFromEnv();
      const wrapper = createWrapper(config);

      const [balance, symbol, decimals] = await Promise.all([
        wrapper.decryptBalance(),
        wrapper.symbol(),
        wrapper.decimals(),
      ]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                balance: balance.toString(),
                symbol,
                decimals,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
