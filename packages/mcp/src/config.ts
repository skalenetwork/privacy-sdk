import { ConfidentialWrapper } from "@skalenetwork/privacy-sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

export interface ResolvedConfig {
  rpcUrl: string;
  privateKey: Hex;
  wrapperAddress: Hex;
  viewerPrivateKey?: Hex;
}

export function getConfigFromEnv(): ResolvedConfig {
  const rpcUrl = process.env.SKALE_RPC_URL;
  const privateKey = (process.env.SKALE_PRIVATE_KEY ?? process.env.PRIVATE_KEY) as Hex | undefined;
  const wrapperAddress = (process.env.SKALE_WRAPPER_ADDRESS ?? process.env.WRAPPER_ADDRESS) as
    Hex | undefined;
  const viewerPrivateKey = (process.env.SKALE_VIEWER_PRIVATE_KEY ??
    process.env.VIEWER_PRIVATE_KEY) as Hex | undefined;

  if (!rpcUrl) throw new Error("SKALE_RPC_URL env var is required");
  if (!privateKey) throw new Error("SKALE_PRIVATE_KEY or PRIVATE_KEY env var is required");
  if (!wrapperAddress)
    throw new Error("SKALE_WRAPPER_ADDRESS or WRAPPER_ADDRESS env var is required");

  return { rpcUrl, privateKey, wrapperAddress, viewerPrivateKey };
}

export function createWrapper(config: ResolvedConfig): ConfidentialWrapper {
  const account = privateKeyToAccount(config.privateKey);
  const walletClient = createWalletClient({
    account,
    transport: http(config.rpcUrl),
  });

  return new ConfidentialWrapper({
    rpcUrl: config.rpcUrl,
    address: config.wrapperAddress,
    signer: {
      address: account.address,
      sendTransaction: (tx) => walletClient.sendTransaction({ ...tx, chain: null }),
    },
    viewerPrivateKey: config.viewerPrivateKey,
  });
}
