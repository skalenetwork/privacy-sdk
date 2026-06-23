import { encodeAbiParameters, encodeFunctionData, type Hex } from "viem";
import { confidentialWrapperAbi } from "../abi/confidentialWrapper.js";
import { getValueForCtx } from "./funding.js";
import type {
  ActionConfig,
  ApproveParams,
  TransferParams,
  WrapParams,
  UnwrapParams,
} from "./types.js";

export async function approve(config: ActionConfig, params: ApproveParams): Promise<Hex> {
  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "approve",
    args: [params.spender, params.amount],
  });
  return config.signer.sendTransaction({ to: config.address, data });
}

export async function transfer(config: ActionConfig, params: TransferParams): Promise<Hex> {
  const value = await getValueForCtx(config);

  const valueHex = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [config.signer.address, params.amount],
  );
  const encryptedValue = await config.bite.encryptMessageForCTX(valueHex, config.address);

  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "encryptedTransfer",
    args: [params.to, encryptedValue as Hex],
  });
  return config.signer.sendTransaction({ to: config.address, data, value });
}

export async function wrap(config: ActionConfig, params: WrapParams): Promise<Hex> {
  const value = await getValueForCtx(config);

  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "depositForWithGasToken",
    args: [params.receiver, params.amount],
  });
  return config.signer.sendTransaction({ to: config.address, data, value });
}

export async function unwrap(config: ActionConfig, params: UnwrapParams): Promise<Hex> {
  const value = await getValueForCtx(config);

  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "withdrawToWithGasToken",
    args: [params.receiver, params.amount],
  });
  return config.signer.sendTransaction({ to: config.address, data, value });
}
