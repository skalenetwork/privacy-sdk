import { ConfidentialWrapper } from "@skalenetwork/privacy-sdk";
import { deriveViewerKeypair } from "@skalenetwork/privacy-sdk/utils";
import { createPublicClient, createWalletClient, http, parseAbi, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "dotenv";
import { existsSync } from "fs";

// Load .env.e2e if present, otherwise fall back to .env
if (existsSync(".env.e2e")) {
  config({ path: ".env.e2e" });
} else {
  config();
}

const RPC_URL = process.env.SKALE_RPC_URL!;
const WRAPPER_ADDRESS = process.env.WRAPPER_ADDRESS! as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY! as `0x${string}`;
const RECIPIENT = process.env.RECIPIENT! as `0x${string}`;
const AMOUNT_INPUT = process.env.AMOUNT || "1"; // amount to wrap (as a decimal string)

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, transport: http(RPC_URL) });

  const token = new ConfidentialWrapper({
    rpcUrl: RPC_URL,
    address: WRAPPER_ADDRESS,
    signer: {
      address: account.address,
      sendTransaction: (tx) => walletClient.sendTransaction({ ...tx, chain: null }),
    },
  });

  // Derive and register viewer keypair (skip if already registered)
  const sig = await walletClient.signMessage({ message: "SKALE Privacy Viewer Key", account });
  const { privateKey, publicKey } = deriveViewerKeypair(sig);
  token.setViewerPrivateKey(privateKey);
  const existingViewerAddress = await token.viewerAddress();
  if (existingViewerAddress === "0x0000000000000000000000000000000000000000") {
    const registerTxHash = await token.registerViewerPublicKey(publicKey);
    await publicClient.waitForTransactionReceipt({ hash: registerTxHash });
    console.log("Viewer key registered");
  } else {
    console.log(`Viewer key already registered (${existingViewerAddress})`);
  }

  // Approve underlying ERC-20 to be spent by the wrapper contract
  const decimals = await token.decimals();
  const AMOUNT_USDC = parseUnits(AMOUNT_INPUT, decimals);
  const underlyingAddress = await token.underlying();
  const approveTxHash = await walletClient.writeContract({
    address: underlyingAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [WRAPPER_ADDRESS, AMOUNT_USDC],
    chain: null,
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
  console.log(`Approved ${AMOUNT_USDC} underlying tokens — tx: ${approveTxHash}`);

  // Wrap ERC-20 → confidential
  const { ctxHash: wrapCtxHash } = await token.wrap(account.address, AMOUNT_USDC).waitForCtx();
  console.log(`Wrapped ${AMOUNT_USDC} tokens — CTX hash: ${wrapCtxHash}`);

  // Confidential transfer
  const { ctxHash: transferCtxHash } = await token
    .transfer(RECIPIENT, AMOUNT_USDC)
    .waitForCtx();
  console.log(`Transferred ${AMOUNT_USDC} to ${RECIPIENT} — CTX hash: ${transferCtxHash}`);

  // Decrypt balance
  const balance = await token.decryptBalance();
  console.log(`Remaining confidential balance: ${balance}`);
}

main().catch(console.error);
