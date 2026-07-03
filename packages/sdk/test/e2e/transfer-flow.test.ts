/**
 * E2E test: full transfer flow on a live SKALE chain.
 *
 * Requires env vars:
 *   SKALE_RPC_URL     - SKALE chain JSON-RPC endpoint
 *   PRIVATE_KEY       - Funded account private key (hex, with 0x prefix)
 *   WRAPPER_ADDRESS   - ConfidentialWrapper contract address
 *
 * Run: npm run test:e2e
 * Skipped automatically if env vars are not set.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  encodeFunctionData,
  http,
  parseEventLogs,
  type Hex,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { ConfidentialWrapper } from "../../src/ConfidentialWrapper.js";
import { deriveViewerKeypair } from "../../src/utils/viewerKey.js";
import { confidentialWrapperAbi } from "../../src/abi/confidentialWrapper.js";

const RPC_URL = process.env.SKALE_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex | undefined;
const WRAPPER_ADDRESS = process.env.WRAPPER_ADDRESS as Hex | undefined;

const skip = !RPC_URL || !PRIVATE_KEY || !WRAPPER_ADDRESS;
console.log(`E2E test configuration: ${skip ? "SKIPPED (missing env vars)" : "RUNNING"}`);

describe.skipIf(skip)("E2E: transfer flow", () => {
  let token: ConfidentialWrapper;
  let account: Account;
  let publicClient: ReturnType<typeof createPublicClient>;
  let walletClient: ReturnType<typeof createWalletClient>;

  beforeAll(async () => {
    account = privateKeyToAccount(PRIVATE_KEY!);

    walletClient = createWalletClient({
      account,
      transport: http(RPC_URL!),
    });

    publicClient = createPublicClient({
      transport: http(RPC_URL!),
    });

    token = new ConfidentialWrapper({
      rpcUrl: RPC_URL!,
      address: WRAPPER_ADDRESS!,
      signer: {
        address: account.address,
        sendTransaction: async (tx) => {
          const hash = await walletClient.sendTransaction({
            account,
            to: tx.to,
            data: tx.data,
            value: tx.value,
            chain: null,
          });
          await publicClient.waitForTransactionReceipt({ hash });
          return hash;
        },
      },
    });

    // Derive and register viewer key
    const sig = await walletClient.signMessage({
      message: "SKALE Privacy Viewer Key",
      account,
    });
    const keypair = deriveViewerKeypair(sig as Hex);
    token.setViewerPrivateKey(keypair.privateKey);

    // Register on-chain (idempotent - may already be registered)
    try {
      await token.registerViewerPublicKey(keypair.publicKey);
      console.log("Viewer key registered on-chain.");
    } catch {
      // already registered
      console.log(
        "Viewer key registration failed (may already be registered) - proceeding anyway.",
      );
    }
  });

  it("reads token metadata", async () => {
    const [name, symbol, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
    ]);

    expect(name).toBeTruthy();
    expect(symbol).toBeTruthy();
    expect(decimals).toBeGreaterThanOrEqual(0);
  });

  it("balanceOf decrypts encrypted balance", async () => {
    const balance = await token.decryptBalance();
    console.log("Encrypted balance:", balance);
    expect(typeof balance).toBe("bigint");
    expect(balance).toBeGreaterThanOrEqual(0n);
  });

  it("wrap → balanceOf → transfer → unwrap", async () => {
    const amount = 1n; // minimal amount

    // Approve underlying ERC-20 for wrapping
    const underlying = await token.underlying();
    const approveHash = await walletClient.sendTransaction({
      account,
      to: underlying,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [WRAPPER_ADDRESS!, amount],
      }),
      chain: null,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Wrap
    const wrapCtx = await token.wrap(account.address, amount).waitForCtx();
    expect(wrapCtx.originHash).toMatch(/^0x/);
    expect(wrapCtx.ctxHash).toMatch(/^0x/);

    // Check balance after wrap
    const balanceAfterWrap = await token.decryptBalance();
    expect(balanceAfterWrap).toBeGreaterThanOrEqual(amount);

    // Transfer to self
    const transferCtx = await token.transfer(account.address, amount).waitForCtx();
    expect(transferCtx.originHash).toMatch(/^0x/);
    expect(transferCtx.ctxHash).toMatch(/^0x/);

    // Unwrap
    const unwrapCtx = await token.unwrap(account.address, amount).waitForCtx();
    expect(unwrapCtx.originHash).toMatch(/^0x/);
    expect(unwrapCtx.ctxHash).toMatch(/^0x/);
  }, 120_000); // 2 min timeout for on-chain ops

  it("grant access by transferId → decrypt historic transfer", async () => {
    const amount = 1n;

    // Transfer to self to get a CTX with EncryptedTransfer event
    const transferCtx = await token.transfer(account.address, amount).waitForCtx();
    const ctxHash = transferCtx.ctxHash;
    expect(ctxHash).toMatch(/^0x/);

    // 1. Get transferId from the CTX receipt
    const events = parseEventLogs({
      abi: confidentialWrapperAbi,
      logs: transferCtx.ctxReceipt.logs,
      eventName: "EncryptedTransfer",
    });
    const transferId = (events[0]?.args as { transferId?: bigint })?.transferId;
    expect(transferId).toBeDefined();
    console.log("Transfer ID:", transferId);

    // 2. Grant historic view access for this specific transferId
    const viewerAddr = await token.viewerAddress();
    const grantHash = await token.authorizeHistoricViewForTransfer(viewerAddr, transferId!);
    expect(grantHash).toMatch(/^0x/);
    console.log("Granted historic view for transferId:", transferId);

    // 3. Decrypt the historic transfer
    const decryptedTransfer = await token.requestTransferDecryption(ctxHash);
    expect(decryptedTransfer.from.toLowerCase()).toBe(account.address.toLowerCase());
    expect(decryptedTransfer.to.toLowerCase()).toBe(account.address.toLowerCase());
    expect(decryptedTransfer.value).toBe(amount);
    console.log("Decrypted historic transfer:", decryptedTransfer);
  }, 120_000); // 2 min timeout for on-chain ops
});
