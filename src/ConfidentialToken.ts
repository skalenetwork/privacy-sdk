import { createPublicClient, http, parseEventLogs, type Hex, type PublicClient } from "viem";
import { BITE } from "@skalenetwork/bite";

import type { ConfidentialTokenConfig, TransferData } from "./types.js";
import type { ActionConfig } from "./actions/types.js";
import * as actions from "./actions/index.js";
import { confidentialWrapperAbi } from "./abi/confidentialWrapper.js";
import { createCtxPromise, type CtxPromise, waitForCtx } from "./utils/ctx.js";

export class ConfidentialToken {
  readonly rpcUrl: string;
  readonly address: Hex;
  readonly signer: {
    address: Hex;
    sendTransaction(tx: { to: Hex; data: Hex; value?: bigint }): Promise<Hex>;
  };
  private viewerPrivateKey?: Hex;
  protected client: PublicClient;
  private bite: BITE;

  constructor(config: ConfidentialTokenConfig) {
    this.rpcUrl = config.rpcUrl;
    this.address = config.address;
    this.signer = config.signer;
    this.viewerPrivateKey = config.viewerPrivateKey;
    this.client = createPublicClient({ transport: http(config.rpcUrl) }) as PublicClient;
    this.bite = new BITE(config.rpcUrl);
  }

  protected get actionConfig(): ActionConfig {
    return {
      rpcUrl: this.rpcUrl,
      address: this.address,
      publicClient: this.client,
      signer: this.signer,
      bite: this.bite,
    };
  }

  setViewerPrivateKey(privateKey: Hex): void {
    this.viewerPrivateKey = privateKey;
  }

  // --- Standard ERC-20 reads ---

  async name(): Promise<string> {
    return (await this.client.readContract({
      address: this.address,
      abi: confidentialWrapperAbi,
      functionName: "name",
    })) as string;
  }

  async symbol(): Promise<string> {
    return (await this.client.readContract({
      address: this.address,
      abi: confidentialWrapperAbi,
      functionName: "symbol",
    })) as string;
  }

  async decimals(): Promise<number> {
    return Number(
      await this.client.readContract({
        address: this.address,
        abi: confidentialWrapperAbi,
        functionName: "decimals",
      }),
    );
  }

  async allowance(owner: Hex, spender: Hex): Promise<bigint> {
    return (await this.client.readContract({
      address: this.address,
      abi: confidentialWrapperAbi,
      functionName: "allowance",
      args: [owner, spender],
    })) as bigint;
  }

  // --- Privacy-specific reads ---

  async viewerAddress(): Promise<Hex> {
    return (await this.client.readContract({
      address: this.address,
      abi: confidentialWrapperAbi,
      functionName: "viewerAddresses",
      args: [this.signer.address],
    })) as Hex;
  }

  async decryptBalance(): Promise<bigint> {
    if (!this.viewerPrivateKey) {
      throw new Error("Viewer key is required to decrypt balance.");
    }
    return actions.decryptTokenBalance(this.actionConfig, { viewerKey: this.viewerPrivateKey });
  }

  // --- Standard ERC-20 writes ---

  async approve(spender: Hex, amount: bigint): Promise<Hex> {
    return actions.approve(this.actionConfig, { spender, amount });
  }

  // --- Privacy-specific writes ---

  transfer(to: Hex, amount: bigint): CtxPromise {
    return createCtxPromise(actions.transfer(this.actionConfig, { to, amount }), this.client);
  }

  // --- Viewer key management ---

  async registerViewerPublicKey(publicKey: Hex): Promise<Hex> {
    return actions.registerViewerKey(this.actionConfig, { publicKey });
  }

  async authorizeHistoricViewForRange(
    address: Hex,
    fromTimestamp: bigint,
    toTimestamp: bigint,
  ): Promise<Hex> {
    return actions.authorizeHistoricViewForRange(this.actionConfig, {
      address,
      fromTimestamp,
      toTimestamp,
    });
  }

  async authorizeHistoricViewForTransfer(address: Hex, transferId: bigint): Promise<Hex> {
    return actions.authorizeHistoricViewForTransfer(this.actionConfig, { address, transferId });
  }

  async revokeHistoricView(address: Hex): Promise<Hex> {
    return actions.revokeHistoricView(this.actionConfig, { address });
  }

  // --- Decrypt / history ---

  async requestTransferDecryption(ctxHash: Hex): Promise<TransferData> {
    if (!this.viewerPrivateKey) {
      throw new Error("Viewer key is required to decrypt transfer data.");
    }
    const txHash = await actions.requestTransferDecryption(this.actionConfig, { ctxHash });
    const { ctxReceipt } = await waitForCtx(txHash, this.client);
    const events = parseEventLogs({
      abi: confidentialWrapperAbi,
      logs: ctxReceipt.logs,
      eventName: "ReEncryptedTransfer",
    });
    const event = events[0];
    if (!event) {
      throw new Error("CTX receipt does not contain a ReEncryptedTransfer event.");
    }
    const encryptedData = (event.args as { encryptedTransfer?: Hex }).encryptedTransfer;
    if (!encryptedData) {
      throw new Error("CTX receipt does not contain a ReEncryptedTransfer event.");
    }
    return actions.decryptHistoricTransferData({ encryptedData, viewerKey: this.viewerPrivateKey });
  }
}
