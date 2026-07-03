# @skalenetwork/privacy-sdk

[![npm](https://img.shields.io/npm/v/@skalenetwork/privacy-sdk)](https://www.npmjs.com/package/@skalenetwork/privacy-sdk)

TypeScript SDK for SKALE Programmable Privacy — encrypted ERC-20 transfers with on-chain confidential computation.

## Install

```bash
npm install @skalenetwork/privacy-sdk
```

## Quick Start

The SDK accepts any signer that implements `{ address, sendTransaction }`.

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

## Usage

```typescript
import { deriveViewerKeypair } from "@skalenetwork/privacy-sdk/utils";

// Derive viewer keypair from a signed message (once per account)
const sig = await walletClient.signMessage({ message: "SKALE Privacy Viewer Key", account });
const { privateKey, publicKey } = deriveViewerKeypair(sig);
token.setViewerPrivateKey(privateKey);
await token.registerViewerPublicKey(publicKey);

// Wrap underlying ERC-20 → confidential token (approve underlying first)
const { ctxHash } = await token.wrap(account.address, 1000n).waitForCtx();

// Confidential transfer
const { ctxHash, ctxReceipt } = await token.transfer(recipient, 500n).waitForCtx();

// Decrypt balance
const balance = await token.decryptBalance();

// Unwrap back to ERC-20
await token.unwrap(account.address, 500n).waitForCtx();
```

## CtxPromise pattern

Methods that trigger a CTX (`transfer`, `wrap`, `unwrap`) return a `CtxPromise`:

```typescript
// Resolves quickly once the origin tx is submitted:
const originHash: Hex = await token.transfer(to, amount);

// Resolves once the callback is also mined (balance actually updated):
const { originHash, originReceipt, ctxHash, ctxReceipt } =
  await token.transfer(to, amount).waitForCtx();
```

## API

### `ConfidentialToken`

| Method | Returns | Description |
|--------|---------|-------------|
| `name()` | `Promise<string>` | Token name |
| `symbol()` | `Promise<string>` | Token symbol |
| `decimals()` | `Promise<number>` | Token decimals |
| `allowance(owner, spender)` | `Promise<bigint>` | ERC-20 allowance |
| `viewerAddress()` | `Promise<Hex>` | Registered viewer address for the signer |
| `decryptBalance()` | `Promise<bigint>` | Decrypt encrypted balance (requires viewer key) |
| `approve(spender, amount)` | `Promise<Hex>` | ERC-20 approve |
| `transfer(to, amount)` | `CtxPromise` | Encrypted confidential transfer |
| `registerViewerPublicKey(publicKey)` | `Promise<Hex>` | Register viewer public key on-chain |
| `authorizeHistoricViewForRange(address, from, to)` | `Promise<Hex>` | Grant time-range historic view |
| `authorizeHistoricViewForTransfer(address, transferId)` | `Promise<Hex>` | Grant per-transfer historic view |
| `revokeHistoricView(address)` | `Promise<Hex>` | Revoke historic view access |
| `requestTransferDecryption(ctxHash)` | `Promise<TransferData>` | Request + decrypt a historic transfer |
| `setViewerPrivateKey(privateKey)` | `void` | Set viewer private key for decryption |

### `ConfidentialWrapper` (extends `ConfidentialToken`)

| Method | Returns | Description |
|--------|---------|-------------|
| `underlying()` | `Promise<Hex>` | Address of the underlying plain ERC-20 |
| `wrap(receiver, amount)` | `CtxPromise` | Deposit ERC-20 → confidential token |
| `unwrap(receiver, amount)` | `CtxPromise` | Withdraw confidential → ERC-20 |

## Tree-shakable actions

For custom orchestration or minimal bundle size, import standalone action functions:

```typescript
import { transfer, wrap, decryptTokenBalance } from "@skalenetwork/privacy-sdk/actions";
import type { ActionConfig } from "@skalenetwork/privacy-sdk/actions";
```

See [docs/api.md](docs/api.md) for the full actions and utils reference.

## Architecture

```
@skalenetwork/privacy-sdk
├── .              → ConfidentialToken, ConfidentialWrapper (stateful facades)
├── ./actions      → Tree-shakable stateless functions
└── ./utils        → Crypto, CTX polling, viewer key utilities
```

## Docs

- [Concepts](docs/concepts.md) — CTX lifecycle, viewer keys, CtxPromise
- [Architecture](docs/architecture.md) — three-layer design
- [API Reference](docs/api.md) — full method and type tables

## Learn more

- [SKALE Programmable Privacy](https://docs.skale.space/developers/programmable-privacy/)
- [Conditional Transactions](https://docs.skale.space/developers/programmable-privacy/conditional-transactions)
