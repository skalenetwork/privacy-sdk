import { confidentialWrapperAbi } from "../abi/confidentialWrapper.js";
import type { ActionConfig } from "./types.js";

const CTX_RESERVE_THRESHOLD = 1n;

export async function getCtxBalance(config: ActionConfig): Promise<bigint> {
  return (await config.publicClient.readContract({
    address: config.address,
    abi: confidentialWrapperAbi,
    functionName: "gasTokenBalanceOf",
    args: [config.signer.address],
  })) as bigint;
}

export async function getCtxRawCost(config: ActionConfig): Promise<bigint> {
  return (await config.publicClient.readContract({
    address: config.address,
    abi: confidentialWrapperAbi,
    functionName: "callbackFee",
  })) as bigint;
}

export async function getCtxOperationCost(config: ActionConfig): Promise<bigint> {
  const [fee, balance] = await Promise.all([getCtxRawCost(config), getCtxBalance(config)]);
  const topUp = CTX_RESERVE_THRESHOLD * fee - balance;
  return fee + (topUp > 0n ? topUp : 0n);
}
