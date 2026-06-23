import { bytesToHex, parseEventLogs, type Hex } from "viem";
import { confidentialWrapperAbi } from "../abi/confidentialWrapper.js";
import { decryptBalance, decryptTransferData } from "../utils/crypto.js";
import type {
  ActionConfig,
  DecryptBalanceParams,
  DecryptHistoricTransferDataParams,
  GetTransferIdParams,
} from "./types.js";
import type { TransferData } from "../types.js";

export async function decryptTokenBalance(
  config: ActionConfig,
  params: DecryptBalanceParams,
): Promise<bigint> {
  const raw = await config.publicClient.readContract({
    address: config.address,
    abi: confidentialWrapperAbi,
    functionName: "encryptedBalanceOf",
    args: [config.signer.address],
  });

  const encryptedHex = (typeof raw === "string" ? raw : bytesToHex(raw as Uint8Array)) as Hex;

  return decryptBalance(encryptedHex, params.viewerKey);
}

export async function decryptHistoricTransferData(
  params: DecryptHistoricTransferDataParams,
): Promise<TransferData> {
  return decryptTransferData(params.encryptedData, params.viewerKey);
}

export async function getTransferId(
  config: ActionConfig,
  params: GetTransferIdParams,
): Promise<bigint> {
  const receipt = await config.publicClient.waitForTransactionReceipt({ hash: params.ctxHash });
  const events = parseEventLogs({
    abi: confidentialWrapperAbi,
    logs: receipt.logs,
    eventName: "EncryptedTransfer",
  });

  const event = events[0];
  if (!event) {
    throw new Error("CTX receipt does not contain an EncryptedTransfer event.");
  }

  const transferId = (event.args as { transferId?: bigint }).transferId;
  if (transferId === undefined) {
    throw new Error("CTX receipt does not contain an EncryptedTransfer event.");
  }

  return transferId;
}
