import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { privateKeyToAccount } from "viem/accounts";
import { createWrapper, getConfigFromEnv } from "../config.js";

export function walletInfoTool(server: McpServer) {
  server.tool(
    "confidential_wallet_info",
    "Return the configured wallet address and its current confidential token balance.",
    {},
    async () => {
      const config = getConfigFromEnv();
      const account = privateKeyToAccount(config.privateKey);
      const wrapper = createWrapper(config);

      const [balance, symbol, decimals] = await Promise.all([
        wrapper.decryptBalance(),
        wrapper.symbol(),
        wrapper.decimals(),
      ]);

      const humanBalance = (Number(balance) / 10 ** decimals).toString();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                address: account.address,
                confidential_token_balance: `${humanBalance} ${symbol}`,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
