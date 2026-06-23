import { encodeFunctionData, parseEventLogs, type Hex } from "viem";
import { confidentialWrapperAbi } from "../abi/confidentialWrapper.js";
import { parsePublicKeyCoordinates } from "../utils/viewerKey.js";
import { getCtxOperationCost } from "./funding.js";
import type { ActionConfig } from "./types.js";

export async function registerViewerKey(config: ActionConfig, publicKey: Hex): Promise<Hex> {
  const { x, y } = parsePublicKeyCoordinates(publicKey);
  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "setViewerPublicKey",
    args: [{ x, y }],
  });
  return config.signer.sendTransaction({ to: config.address, data });
}

export async function authorizeHistoricViewForRange(
  config: ActionConfig,
  address: Hex,
  fromTimestamp: bigint,
  toTimestamp: bigint,
): Promise<Hex> {
  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "authorizeHistoricViewTimeRange",
    args: [address, fromTimestamp, toTimestamp],
  });
  return config.signer.sendTransaction({ to: config.address, data });
}

export async function authorizeHistoricViewForTransfer(
  config: ActionConfig,
  address: Hex,
  transferId: bigint,
): Promise<Hex> {
  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "authorizeHistoricViewTransferId",
    args: [address, transferId],
  });
  return config.signer.sendTransaction({ to: config.address, data });
}

export async function revokeHistoricView(config: ActionConfig, address: Hex): Promise<Hex> {
  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "removeHistoricViewAuth",
    args: [address],
  });
  return config.signer.sendTransaction({ to: config.address, data });
}

export async function requestTransferDecryption(config: ActionConfig, ctxHash: Hex): Promise<Hex> {
  const value = await getCtxOperationCost(config);

  // 1. Get encryptedData from the EncryptedTransfer event
  const receipt = await config.publicClient.waitForTransactionReceipt({ hash: ctxHash });
  const events = parseEventLogs({
    abi: confidentialWrapperAbi,
    logs: receipt.logs,
    eventName: "EncryptedTransfer",
  });

  const event = events[0];
  if (!event) {
    throw new Error("CTX receipt does not contain an EncryptedTransfer event.");
  }

  const args = event.args as { encryptedData?: Hex; transferId?: bigint; from?: Hex; to?: Hex };
  const { encryptedData, transferId, from, to } = args;

  if (!encryptedData || transferId === undefined || !from || !to) {
    throw new Error("CTX receipt does not contain an EncryptedTransfer event.");
  }

  // 2. Check permissions
  const viewerAddress = (await config.publicClient.readContract({
    address: config.address,
    abi: confidentialWrapperAbi,
    functionName: "viewerAddresses",
    args: [config.signer.address],
  })) as Hex;

  const block = await config.publicClient.getBlock({ blockNumber: receipt.blockNumber });
  const canDecrypt = (await config.publicClient.readContract({
    address: config.address,
    abi: confidentialWrapperAbi,
    functionName: "canDecryptHistoricTransfer",
    args: [viewerAddress, transferId, from, to, block.timestamp],
  })) as boolean;

  if (!canDecrypt) {
    throw new Error("Viewer is not authorized to decrypt this historic transfer.");
  }

  // 3. Request re-encryption
  const data = encodeFunctionData({
    abi: confidentialWrapperAbi,
    functionName: "requestDecryptHistoricTransferFor",
    args: [encryptedData, viewerAddress],
  });
  return config.signer.sendTransaction({ to: config.address, data, value });
}
