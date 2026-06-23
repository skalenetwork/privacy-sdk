# @skalenetwork/privacy-sdk

TypeScript SDK for SKALE Programmable Privacy — encrypted ERC-20 transfers with on-chain confidential computation.

## Install

```bash
npm install @skalenetwork/privacy-sdk
```

## Quick Start

The SDK accepts any signer that implements `{ address, sendTransaction }`. Here's how to initialize with popular web3 libraries:

### With viem

```typescript
import { ConfidentialWrapper } from "@skalenetwork/privacy-sdk";
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
```

### With ethers v6

```typescript
import { ConfidentialWrapper } from "@skalenetwork/privacy-sdk";
import { Wallet, JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider(RPC_URL);
const wallet = new Wallet("0x...", provider);

const token = new ConfidentialWrapper({
  rpcUrl: RPC_URL,
  address: WRAPPER_ADDRESS,
  signer: {
    address: wallet.address as `0x${string}`,
    sendTransaction: async (tx) => {
      const resp = await wallet.sendTransaction(tx);
      return resp.hash as `0x${string}`;
    },
  },
});
```

### With web3.js

```typescript
import { ConfidentialWrapper } from "@skalenetwork/privacy-sdk";
import Web3 from "web3";

const web3 = new Web3(RPC_URL);
const account = web3.eth.accounts.privateKeyToAccount("0x...");

const token = new ConfidentialWrapper({
  rpcUrl: RPC_URL,
  address: WRAPPER_ADDRESS,
  signer: {
    address: account.address as `0x${string}`,
    sendTransaction: async (tx) => {
      const receipt = await web3.eth.sendTransaction({ from: account.address, ...tx });
      return receipt.transactionHash as `0x${string}`;
    },
  },
});
```

### Usage

```typescript
import { deriveViewerKeypair } from "@skalenetwork/privacy-sdk/utils";

// Derive viewer keypair from a signed message (do this once per account)
const sig = await walletClient.signMessage({ message: "SKALE Privacy Viewer Key", account });
const { privateKey, publicKey } = deriveViewerKeypair(sig);
token.setViewerPrivateKey(privateKey);
await token.registerViewerPublicKey(publicKey);

// Wrap underlying ERC-20 → confidential token (approve underlying first)
const { ctxHash: wrapCtxHash } = await token.wrap(account.address, 1000n).waitForCtx();

// Confidential transfer
const { ctxHash: transferCtxHash, ctxReceipt } = await token.transfer(recipient, 500n).waitForCtx();

// Decrypt balance
const balance = await token.decryptBalance();

// Unwrap back to ERC-20
await token.unwrap(account.address, 500n).waitForCtx();
```

## Docs

- [Concepts](https://github.com/skalenetwork/privacy-sdk/blob/develop/docs/concepts.md) — CTX lifecycle, viewer keys, CtxPromise pattern
- [Architecture](https://github.com/skalenetwork/privacy-sdk/blob/develop/docs/architecture.md) — three-layer design (facades / actions / utils)
- [API Reference](https://github.com/skalenetwork/privacy-sdk/blob/develop/docs/api.md) — full method tables for all exports

