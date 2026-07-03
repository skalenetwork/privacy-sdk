import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createWrapper, getConfigFromEnv } from "../config.js";
import type { Hex } from "viem";

export function wrapTokensTool(server: McpServer) {
  server.tool(
    "wrap_tokens",
    "Wrap plain ERC-20 tokens into their confidential (encrypted) form. Requires prior ERC-20 approval.",
    {
      receiver: z.string().describe("Receiver address for the wrapped tokens (0x...)"),
      amount: z.string().describe("Amount to wrap in token base units"),
    },
    async ({ receiver, amount }) => {
      const config = getConfigFromEnv();
      const wrapper = createWrapper(config);

      const result = await wrapper.wrap(receiver as Hex, BigInt(amount)).waitForCtx();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                status: "confirmed",
                operation: "wrap",
                originHash: result.originHash,
                ctxHash: result.ctxHash,
                receiver,
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
