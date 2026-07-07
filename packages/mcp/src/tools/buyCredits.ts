import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Hex } from "viem";
import { createCreditStation, getConfigFromEnv } from "../config.js";

export function buyCredits(server: McpServer) {
  server.tool(
    "buy_credits",
    "Buy credits on the configured SKALE chain via CreditStation on the beacon chain. Requires prior knowledge of which token to use (call get_credit_price first). Handles ERC-20 approval automatically.",
    {
      amount: z.string().describe("Number of credits to purchase (e.g. '10')"),
      token: z.string().describe("ERC-20 token address to pay with (0x...)"),
      schainName: z
        .string()
        .optional()
        .describe("SKALE chain name to buy credits for (defaults to configured network)"),
    },
    async ({ amount, token, schainName }) => {
      const config = getConfigFromEnv();
      const station = createCreditStation(config);
      const result = await station.buy(
        BigInt(amount),
        token as Hex,
        schainName ?? config.schainName,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                status: "confirmed",
                ...result,
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
