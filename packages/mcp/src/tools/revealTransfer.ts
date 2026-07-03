import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createWrapper, getConfigFromEnv } from "../config.js";
import type { Hex } from "viem";

export function revealTransferTool(server: McpServer) {
  server.tool(
    "reveal_transfer",
    "Decrypt a historic confidential transfer to reveal its details (from, to, amount, timestamp).",
    {
      ctxHash: z
        .string()
        .describe("The CTX transaction hash of the transfer to decrypt"),
    },
    async ({ ctxHash }) => {
      const config = getConfigFromEnv();
      const wrapper = createWrapper(config);

      const transfer = await wrapper.requestTransferDecryption(ctxHash as Hex);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                from: transfer.from,
                to: transfer.to,
                amount: transfer.value.toString(),
                timestamp: transfer.timestamp.toString(),
                transferId: transfer.transferId.toString(),
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
