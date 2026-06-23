import type { Hex } from "viem";

import { ConfidentialToken } from "./ConfidentialToken.js";
import { confidentialWrapperAbi } from "./abi/confidentialWrapper.js";
import * as actions from "./actions/index.js";
import { createCtxPromise, type CtxPromise } from "./utils/ctx.js";

export class ConfidentialWrapper extends ConfidentialToken {
  async underlying(): Promise<Hex> {
    return (await this.client.readContract({
      address: this.address,
      abi: confidentialWrapperAbi,
      functionName: "underlying",
    })) as Hex;
  }

  wrap(receiver: Hex, amount: bigint): CtxPromise {
    return createCtxPromise(actions.wrap(this.actionConfig, receiver, amount), this.client);
  }

  unwrap(receiver: Hex, amount: bigint): CtxPromise {
    return createCtxPromise(actions.unwrap(this.actionConfig, receiver, amount), this.client);
  }
}
