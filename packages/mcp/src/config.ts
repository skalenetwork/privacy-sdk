import { ConfidentialWrapper, CreditStation } from "@skalenetwork/privacy-sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex, UnsignedTx } from "@skalenetwork/privacy-sdk";
import { DEFAULT_NETWORK, getChainConfig } from "./chains.js";

export interface ResolvedConfig {
  rpcUrl: string;
  privateKey: Hex;
  wrapperAddress: Hex;
  viewerPrivateKey?: Hex;
  beaconRpcUrl: string;
  creditStationAddress: Hex;
  schainName: string;
}

export function getConfigFromEnv(): ResolvedConfig {
  const privateKey = (process.env.SKALE_PRIVATE_KEY ?? process.env.PRIVATE_KEY) as Hex | undefined;
  if (!privateKey) throw new Error("SKALE_PRIVATE_KEY or PRIVATE_KEY env var is required");

  const viewerPrivateKey = (process.env.SKALE_VIEWER_PRIVATE_KEY ??
    process.env.VIEWER_PRIVATE_KEY) as Hex | undefined;

  // Explicit overrides take precedence; otherwise fall back to chain registry
  const network = process.env.SKALE_NETWORK ?? DEFAULT_NETWORK;
  const chain = getChainConfig(network);

  const rpcUrl = process.env.SKALE_RPC_URL ?? chain.rpcUrl;
  const wrapperAddress = (process.env.SKALE_WRAPPER_ADDRESS ??
    process.env.WRAPPER_ADDRESS ??
    chain.wrapperAddress) as Hex;
  const beaconRpcUrl = process.env.BEACON_RPC_URL ?? chain.beaconRpcUrl;
  const creditStationAddress = (process.env.CREDIT_STATION_ADDRESS ??
    chain.creditStationAddress) as Hex;
  const schainName = process.env.SKALE_CHAIN_NAME ?? chain.schainName;

  return {
    rpcUrl,
    privateKey,
    wrapperAddress,
    viewerPrivateKey,
    beaconRpcUrl,
    creditStationAddress,
    schainName,
  };
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
      sendTransaction: (tx: UnsignedTx) => walletClient.sendTransaction({ ...tx, chain: null }),
    },
    viewerPrivateKey: config.viewerPrivateKey,
  });
}

export function createCreditStation(config: ResolvedConfig): CreditStation {
  return new CreditStation({
    beaconRpcUrl: config.beaconRpcUrl,
    address: config.creditStationAddress,
    privateKey: config.privateKey,
  });
}
