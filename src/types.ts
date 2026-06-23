import type { Hex } from "viem";

export type { Hex };

export type Signer = {
  address: Hex;
  sendTransaction(tx: UnsignedTx): Promise<Hex>;
};

export type UnsignedTx = {
  to: Hex;
  data: Hex;
  value?: bigint;
};

export type ViewerKeypair = {
  privateKey: Hex;
  publicKey: Hex;
  x: Hex;
  y: Hex;
};

export type TransferData = {
  from: Hex;
  to: Hex;
  value: bigint;
  timestamp: bigint;
  transferId: bigint;
};

export type ConfidentialTokenConfig = {
  rpcUrl: string;
  address: Hex;
  signer: Signer;
  viewerPrivateKey?: Hex;
};
