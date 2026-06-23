import type { Hex, PublicClient } from "viem";
import type { BITE } from "@skalenetwork/bite";
import type { Signer } from "../types.js";

export type ActionConfig = {
  rpcUrl: string;
  address: Hex;
  publicClient: PublicClient;
  signer: Signer;
  bite: BITE;
};

// --- Action param types ---

export type TransferParams = { to: Hex; amount: bigint };

export type WrapParams = { receiver: Hex; amount: bigint };

export type UnwrapParams = { receiver: Hex; amount: bigint };

export type ApproveParams = { spender: Hex; amount: bigint };

export type TopUpParams = { amount: bigint };

export type RegisterViewerKeyParams = { publicKey: Hex };

export type AuthorizeHistoricViewForRangeParams = {
  address: Hex;
  fromTimestamp: bigint;
  toTimestamp: bigint;
};

export type AuthorizeHistoricViewForTransferParams = { address: Hex; transferId: bigint };

export type RevokeHistoricViewParams = { address: Hex };

export type GetTransferIdParams = { ctxHash: Hex };

export type RequestTransferDecryptionParams = { ctxHash: Hex };

export type DecryptHistoricTransferDataParams = { encryptedData: Hex; viewerKey: Hex };

export type DecryptBalanceParams = { viewerKey: Hex };
