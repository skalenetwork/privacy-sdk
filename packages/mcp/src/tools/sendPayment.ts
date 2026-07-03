import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createWrapper, getConfigFromEnv } from "../config.js";
import type { Hex } from "viem";

export function sendPaymentTool(server: McpServer) {
  server.tool(
    "send_private_payment",
    "Send a confidential encrypted transfer to a recipient. The amount and balances remain hidden on-chain.",
    {
      to: z.string().describe("Recipient address (0x...)"),
      amount: z.string().describe("Amount to send in token base units (e.g. '1000000' for 1 USDC)"),
    },
    async ({ to, amount }) => {
      const config = getConfigFromEnv();
      const wrapper = createWrapper(config);

      const result = await wrapper.transfer(to as Hex, BigInt(amount)).waitForCtx();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                status: "confirmed",
                originHash: result.originHash,
                ctxHash: result.ctxHash,
                recipient: to,
                amount,
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
