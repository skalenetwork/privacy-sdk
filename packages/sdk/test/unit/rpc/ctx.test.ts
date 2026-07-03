import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Hex } from "viem";

import { getCtxHash, getCtxHashes, waitForCtx } from "../../../src/utils/ctx.ts";

const mockRequest = vi.fn();

const mockClient = {
  request: mockRequest,
  waitForTransactionReceipt: vi.fn(),
} as any;

beforeEach(() => {
  mockRequest.mockReset();
  mockClient.waitForTransactionReceipt.mockReset();
});

describe("getCtxHash", () => {
  it("returns hex from RPC result string", async () => {
    mockRequest.mockResolvedValueOnce(
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    );

    const result = await getCtxHash(mockClient, "0x1111" as Hex);

    expect(result).toBe("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");
    expect(mockRequest).toHaveBeenCalledOnce();
    expect(mockRequest).toHaveBeenCalledWith({
      method: "bite_getCraftedCtxs",
      params: ["0x1111"],
    });
  });

  it("normalizes hex without 0x prefix", async () => {
    mockRequest.mockResolvedValueOnce("abcd1234" + "0".repeat(56));

    const result = await getCtxHash(mockClient, "0x1111" as Hex);
    expect(result).toMatch(/^0x/);
  });

  it("returns undefined when result is null", async () => {
    mockRequest.mockResolvedValueOnce(null);

    const result = await getCtxHash(mockClient, "0x1111" as Hex);
    expect(result).toBeUndefined();
  });

  it("throws on RPC error", async () => {
    mockRequest.mockRejectedValueOnce(new Error("Something went wrong"));

    await expect(getCtxHash(mockClient, "0x1111" as Hex)).rejects.toThrow("Something went wrong");
  });
});

describe("getCtxHashes", () => {
  it("collects multiple hex values from nested result", async () => {
    mockRequest.mockResolvedValueOnce({
      hashes: ["0xaaaa" + "0".repeat(60), "0xbbbb" + "0".repeat(60)],
    });

    const result = await getCtxHashes(mockClient, "0x1111" as Hex);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatch(/^0xaaaa/);
    expect(result[1]).toMatch(/^0xbbbb/);
  });

  it("deduplicates identical hashes", async () => {
    const hash = "0xcccc" + "0".repeat(60);
    mockRequest.mockResolvedValueOnce([hash, hash]);

    const result = await getCtxHashes(mockClient, "0x1111" as Hex);
    expect(result).toHaveLength(1);
  });
});

describe("waitForCtx", () => {
  it("waits for tx and ctx receipts, returns all three", async () => {
    const txHash = ("0x" + "aa".repeat(32)) as Hex;
    const ctxHash = ("0x" + "bb".repeat(32)) as Hex;
    const txReceipt = { status: "success", blockNumber: 1n, logs: [] };
    const ctxReceipt = { status: "success", blockNumber: 2n, logs: [] };

    // getCtxHash call
    mockRequest.mockResolvedValueOnce(ctxHash);

    mockClient.waitForTransactionReceipt
      .mockResolvedValueOnce(txReceipt)
      .mockResolvedValueOnce(ctxReceipt);

    const result = await waitForCtx(txHash, mockClient);

    expect(result.originHash).toBe(txHash);
    expect(result.originReceipt).toBe(txReceipt);
    expect(result.ctxHash).toBe(ctxHash);
    expect(result.ctxReceipt).toBe(ctxReceipt);
    expect(mockClient.waitForTransactionReceipt).toHaveBeenCalledTimes(2);
    expect(mockClient.waitForTransactionReceipt).toHaveBeenNthCalledWith(1, { hash: txHash });
    expect(mockClient.waitForTransactionReceipt).toHaveBeenNthCalledWith(2, { hash: ctxHash });
  });

  it("throws when no CTX hash found after receipt", async () => {
    mockRequest.mockResolvedValueOnce(null);

    mockClient.waitForTransactionReceipt.mockResolvedValue({});

    await expect(waitForCtx(("0x" + "aa".repeat(32)) as Hex, mockClient)).rejects.toThrow(
      "No crafted CTX found",
    );
  });
});
