import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createWrapper, getConfigFromEnv } from "../config.js";
import type { Hex } from "viem";

export function unwrapTokensTool(server: McpServer) {
  server.tool(
    "unwrap_tokens",
    "Unwrap confidential tokens back into plain ERC-20 tokens.",
    {
      receiver: z
        .string()
        .describe("Receiver address for the unwrapped ERC-20 tokens (0x...)"),
      amount: z
        .string()
        .describe("Amount to unwrap in token base units"),
    },
    async ({ receiver, amount }) => {
      const config = getConfigFromEnv();
      const wrapper = createWrapper(config);

      const result = await wrapper
        .unwrap(receiver as Hex, BigInt(amount))
        .waitForCtx();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                status: "confirmed",
                operation: "unwrap",
                originHash: result.originHash,
                ctxHash: result.ctxHash,
                receiver,
                amount,
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
