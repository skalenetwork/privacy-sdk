import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createWrapper, getConfigFromEnv } from "../config.js";

export function walletInfoTool(server: McpServer) {
  server.tool(
    "confidential_wallet_info",
    "Return the configured wallet address, confidential token balance, and token metadata (name, symbol, decimals, underlying ERC-20 address). Requires VIEWER_PRIVATE_KEY for balance decryption.",
    {},
    async () => {
      const config = getConfigFromEnv();
      const account = privateKeyToAccount(config.privateKey);
      const wrapper = createWrapper(config);

      const [balance, name, symbol, decimals, underlying] = await Promise.all([
        wrapper.decryptBalance(),
        wrapper.name(),
        wrapper.symbol(),
        wrapper.decimals(),
        wrapper.underlying(),
      ]);

      const humanBalance = formatUnits(balance, decimals);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                address: account.address,
                confidential_token_balance: `${humanBalance} ${symbol}`,
                token: {
                  name,
                  symbol,
                  decimals,
                  underlying,
                  wrapperAddress: config.wrapperAddress,
                },
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
