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
