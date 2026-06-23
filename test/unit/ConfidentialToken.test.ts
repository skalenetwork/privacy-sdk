import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Hex } from "viem";

import { ConfidentialToken } from "../../src/ConfidentialToken.ts";

// Mock viem's createPublicClient
const mockReadContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: () => ({
      readContract: mockReadContract,
      waitForTransactionReceipt: mockWaitForTransactionReceipt,
    }),
  };
});

// Mock BITE
vi.mock("@skalenetwork/bite", () => ({
  BITE: class {
    encryptMessageForCTX = vi.fn().mockResolvedValue("0xencrypted");
  },
}));

// Mock waitForCtx
vi.mock("../../src/utils/ctx.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/ctx.ts")>();
  return {
    ...actual,
    waitForCtx: vi.fn().mockResolvedValue({
      originHash: "0x" + "dd".repeat(32),
      originReceipt: {},
      ctxHash: "0x" + "cc".repeat(32),
      ctxReceipt: { logs: [] },
    }),
  };
});

const WRAPPER = "0x1111111111111111111111111111111111111111" as Hex;
const SIGNER_ADDR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;

function createToken(viewerKey?: Hex) {
  return new ConfidentialToken({
    rpcUrl: "http://localhost:8545",
    address: WRAPPER,
    signer: {
      address: SIGNER_ADDR,
      sendTransaction: vi.fn().mockResolvedValue("0x" + "dd".repeat(32)),
    },
    viewerPrivateKey: viewerKey,
  });
}

beforeEach(() => {
  mockReadContract.mockReset();
  mockWaitForTransactionReceipt.mockReset();
});

describe("ConfidentialToken", () => {
  describe("constructor", () => {
    it("sets public properties", () => {
      const token = createToken();
      expect(token.rpcUrl).toBe("http://localhost:8545");
      expect(token.address).toBe(WRAPPER);
      expect(token.signer.address).toBe(SIGNER_ADDR);
    });
  });

  describe("name()", () => {
    it("calls readContract with correct args", async () => {
      mockReadContract.mockResolvedValueOnce("PrivateUSDC");
      const token = createToken();

      const name = await token.name();

      expect(name).toBe("PrivateUSDC");
      expect(mockReadContract).toHaveBeenCalledWith({
        address: WRAPPER,
        abi: expect.any(Array),
        functionName: "name",
      });
    });
  });

  describe("symbol()", () => {
    it("returns symbol from contract", async () => {
      mockReadContract.mockResolvedValueOnce("pUSDC");
      const token = createToken();

      expect(await token.symbol()).toBe("pUSDC");
    });
  });

  describe("decimals()", () => {
    it("returns number", async () => {
      mockReadContract.mockResolvedValueOnce(18n);
      const token = createToken();

      expect(await token.decimals()).toBe(18);
    });
  });

  describe("viewerAddress()", () => {
    it("reads viewerAddresses from contract", async () => {
      mockReadContract.mockResolvedValueOnce("0x" + "cc".repeat(20));
      const token = createToken();

      const addr = await token.viewerAddress();

      expect(addr).toBe("0x" + "cc".repeat(20));
      expect(mockReadContract).toHaveBeenCalledWith({
        address: WRAPPER,
        abi: expect.any(Array),
        functionName: "viewerAddresses",
        args: [SIGNER_ADDR],
      });
    });
  });

  describe("decryptBalance()", () => {
    it("throws without viewer key", async () => {
      const token = createToken();

      await expect(token.decryptBalance()).rejects.toThrow("Viewer key is required");
    });
  });

  describe("approve()", () => {
    it("sends transaction and returns txHash", async () => {
      const token = createToken();
      const txHash = await token.approve(("0x" + "bb".repeat(20)) as Hex, 100n);

      expect(txHash).toBe("0x" + "dd".repeat(32));
      expect(token.signer.sendTransaction).toHaveBeenCalledWith({
        to: WRAPPER,
        data: expect.any(String),
      });
    });
  });

  describe("transfer()", () => {
    it("encrypts and sends, returns txHash", async () => {
      mockReadContract.mockResolvedValue(1000n); // covers callbackFee + gasTokenBalanceOf
      const token = createToken();
      const txHash = await token.transfer(("0x" + "bb".repeat(20)) as Hex, 1000n);

      expect(txHash).toBe("0x" + "dd".repeat(32));
    });
  });

  describe("setViewerKey()", () => {
    it("allows setting viewer key after construction", () => {
      const token = createToken();
      // Should not throw
      token.setViewerPrivateKey(("0x" + "ff".repeat(32)) as Hex);
    });
  });
});
