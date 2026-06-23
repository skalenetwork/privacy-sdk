import { encodeFunctionData, type Hex } from "viem";
import { confidentialWrapperAbi } from "../abi/confidentialWrapper.js";
import type { ActionConfig, TopUpParams } from "./types.js";

const CTX_RESERVE_THRESHOLD = 1n;

export async function getCtxBalance(config: ActionConfig): Promise<bigint> {
  return (await config.publicClient.readContract({
    address: config.address,
    abi: confidentialWrapperAbi,
    functionName: "gasTokenBalanceOf",
    args: [config.signer.address],
  })) as bigint;
}

export async function getCtxFee(config: ActionConfig): Promise<bigint> {
  return (await config.publicClient.readContract({
    address: config.address,
    abi: confidentialWrapperAbi,
    functionName: "callbackFee",
  })) as bigint;
}

export async function fundCtxBalance(config: ActionConfig, params: TopUpParams): Promise<Hex> {
  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "fundWithGasToken",
    args: [config.signer.address],
  });
  return config.signer.sendTransaction({
    to: config.address,
    data,
    value: params.amount,
  });
}

export async function getValueForCtx(config: ActionConfig): Promise<bigint> {
  const [fee, balance] = await Promise.all([getCtxFee(config), getCtxBalance(config)]);
  const topUp = CTX_RESERVE_THRESHOLD * fee - balance;
  return fee + (topUp > 0n ? topUp : 0n);
}
