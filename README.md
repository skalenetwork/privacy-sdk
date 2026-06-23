# @skalenetwork/privacy-sdk

TypeScript SDK for SKALE Programmable Privacy — encrypted ERC-20 transfers with on-chain confidential computation.

## Install

```bash
npm install @skalenetwork/privacy-sdk
```

## Quick Start

```typescript
import { ConfidentialWrapper } from "@skalenetwork/privacy-sdk";
import { deriveViewerKeypair } from "@skalenetwork/privacy-sdk/utils";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");
const walletClient = createWalletClient({ account, transport: http(RPC_URL) });

const token = new ConfidentialWrapper({
  rpcUrl: RPC_URL,
  address: WRAPPER_ADDRESS,
  signer: {
    address: account.address,
    sendTransaction: (tx) => walletClient.sendTransaction({ ...tx, chain: null }),
  },
});

// Derive viewer keypair from a signed message (do this once per account)
const sig = await walletClient.signMessage({ message: "SKALE Privacy Viewer Key", account });
const { privateKey, publicKey } = deriveViewerKeypair(sig);
token.setViewerPrivateKey(privateKey);
await token.registerViewerPublicKey(publicKey);

// Wrap underlying ERC-20 → confidential token (approve underlying first)
const { ctxHash } = await token.wrap(account.address, 1000n).waitForCtx();

// Confidential transfer — await for origin hash, .waitForCtx() for the full CTX result
const hash = await token.transfer(recipient, 500n);
const { originHash, ctxHash } = await token.transfer(recipient, 500n).waitForCtx();

// Decrypt balance
const balance = await token.decryptBalance();

// Unwrap back to ERC-20
await token.unwrap(account.address, 500n).waitForCtx();
```

## Docs

- [Concepts](https://github.com/skalenetwork/privacy-sdk/blob/develop/docs/concepts.md) — CTX lifecycle, viewer keys, CtxPromise pattern
- [Architecture](https://github.com/skalenetwork/privacy-sdk/blob/develop/docs/architecture.md) — three-layer design (facades / actions / utils)
- [API Reference](https://github.com/skalenetwork/privacy-sdk/blob/develop/docs/api.md) — full method tables for all exports

