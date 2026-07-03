import type { Hex, PublicClient, TransactionReceipt } from "viem";

export type CtxResult = {
  originHash: Hex;
  originReceipt: TransactionReceipt;
  ctxHash: Hex;
  ctxReceipt: TransactionReceipt;
};

export type CtxPromise = Promise<Hex> & {
  waitForCtx(): Promise<CtxResult>;
};

export function createCtxPromise(
  txHashPromise: Promise<Hex>,
  publicClient: PublicClient,
): CtxPromise {
  const promise = txHashPromise as CtxPromise;
  promise.waitForCtx = async () => {
    const txHash = await txHashPromise;
    return waitForCtx(txHash, publicClient);
  };
  return promise;
}

function normalizeHex(value: string): Hex | undefined {
  const trimmed = value.trim();

  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return trimmed as Hex;
  }

  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    return `0x${trimmed}` as Hex;
  }

  return undefined;
}

function findFirstHex(value: unknown): Hex | undefined {
  if (typeof value === "string") {
    return normalizeHex(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = findFirstHex(item);
      if (candidate) {
        return candidate;
      }
    }
    return undefined;
  }

  if (value && typeof value === "object") {
    for (const child of Object.values(value)) {
      const candidate = findFirstHex(child);
      if (candidate) {
        return candidate;
      }
    }
  }

  return undefined;
}

function collectHexValues(value: unknown, acc: Hex[]): void {
  if (typeof value === "string") {
    const normalized = normalizeHex(value);
    if (normalized) {
      acc.push(normalized);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectHexValues(item, acc);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const child of Object.values(value)) {
      collectHexValues(child, acc);
    }
  }
}

async function callBiteGetCraftedCtxs(publicClient: PublicClient, txHash: Hex): Promise<unknown> {
  return publicClient.request({
    method: "bite_getCraftedCtxs" as any,
    params: [txHash] as any,
  });
}

export async function getCtxHash(
  publicClient: PublicClient,
  txHash: Hex,
): Promise<Hex | undefined> {
  const result = await callBiteGetCraftedCtxs(publicClient, txHash);
  return findFirstHex(result);
}

export async function getCtxHashes(publicClient: PublicClient, txHash: Hex): Promise<Hex[]> {
  const result = await callBiteGetCraftedCtxs(publicClient, txHash);
  const allHexes: Hex[] = [];
  collectHexValues(result, allHexes);

  const deduped = new Map<string, Hex>();
  for (const hash of allHexes) {
    deduped.set(hash.toLowerCase(), hash);
  }

  return Array.from(deduped.values());
}

export async function waitForCtx(txHash: Hex, publicClient: PublicClient): Promise<CtxResult> {
  // 1. Wait for original tx to be mined
  const originReceipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // 2. Get CTX hash (deterministic once origin is mined)
  const ctxHash = await getCtxHash(publicClient, txHash);
  if (!ctxHash) {
    throw new Error(`No crafted CTX found for tx ${txHash}.`);
  }

  // 3. Wait for CTX to be mined
  const ctxReceipt = await publicClient.waitForTransactionReceipt({ hash: ctxHash });

  return { originHash: txHash, originReceipt, ctxHash, ctxReceipt };
}
