import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createWrapper, getConfigFromEnv } from "../config.js";

export function tokenInfoTool(server: McpServer) {
  server.tool(
    "get_token_info",
    "Get metadata about the configured confidential token (name, symbol, decimals, underlying ERC-20 address).",
    {},
    async () => {
      const config = getConfigFromEnv();
      const wrapper = createWrapper(config);

      const [name, symbol, decimals, underlying] = await Promise.all([
        wrapper.name(),
        wrapper.symbol(),
        wrapper.decimals(),
        wrapper.underlying(),
      ]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                name,
                symbol,
                decimals,
                underlying,
                wrapperAddress: config.wrapperAddress,
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
