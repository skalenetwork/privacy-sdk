import { encodeAbiParameters, encodeFunctionData, type Hex } from "viem";
import { confidentialWrapperAbi } from "../abi/confidentialWrapper.js";
import { getCtxOperationCost } from "./funding.js";
import type { ActionConfig } from "./types.js";

export async function approve(config: ActionConfig, spender: Hex, amount: bigint): Promise<Hex> {
  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "approve",
    args: [spender, amount],
  });
  return config.signer.sendTransaction({ to: config.address, data });
}

export async function transfer(config: ActionConfig, to: Hex, amount: bigint): Promise<Hex> {
  const value = await getCtxOperationCost(config);

  const valueHex = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [config.signer.address, amount],
  );
  const encryptedValue = await config.bite.encryptMessageForCTX(valueHex, config.address);

  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "encryptedTransfer",
    args: [to, encryptedValue as Hex],
  });
  return config.signer.sendTransaction({ to: config.address, data, value });
}

export async function wrap(config: ActionConfig, receiver: Hex, amount: bigint): Promise<Hex> {
  const value = await getCtxOperationCost(config);

  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "depositForWithGasToken",
    args: [receiver, amount],
  });
  return config.signer.sendTransaction({ to: config.address, data, value });
}

export async function unwrap(config: ActionConfig, receiver: Hex, amount: bigint): Promise<Hex> {
  const value = await getCtxOperationCost(config);

  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "withdrawToWithGasToken",
    args: [receiver, amount],
  });
  return config.signer.sendTransaction({ to: config.address, data, value });
}
