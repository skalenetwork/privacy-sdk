import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createCreditStation, getConfigFromEnv } from "../config.js";

export function getCreditPriceTool(server: McpServer) {
  server.tool(
    "get_credit_price",
    "Get the price of 1 CREDIT for each supported payment token on the CreditStation contract (beacon chain).",
    {},
    async () => {
      const config = getConfigFromEnv();
      const station = createCreditStation(config);
      const prices = await station.getCreditPrices();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(prices, null, 2),
          },
        ],
      };
    },
  );
}
