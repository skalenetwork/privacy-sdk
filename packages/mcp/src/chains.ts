import type { Hex } from "viem";

export interface ChainConfig {
  rpcUrl: string;
  wrapperAddress: Hex;
  label: string;
}

export const CHAINS: Record<string, ChainConfig> = {
  testnet: {
    label: "SKALE Base Sepolia Testnet",
    rpcUrl: "https://base-sepolia-testnet.skalenodes.com/v1/base-testnet",
    wrapperAddress: "0x48d9908986eF5822F419eE5911369f931e7653B3",
  },
};

export const DEFAULT_NETWORK = "testnet";

export function getChainConfig(network: string): ChainConfig {
  const chain = CHAINS[network];
  if (!chain) {
    const available = Object.keys(CHAINS).join(", ");
    throw new Error(
      `Unknown network "${network}". Available networks: ${available}`,
    );
  }
  return chain;
}
