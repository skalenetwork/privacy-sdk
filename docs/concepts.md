# Concepts

## Conditional Transactions (CTX)

On SKALE, token balances and transfer amounts are stored encrypted. A Conditional Transaction (CTX)
is the mechanism that lets smart contracts decrypt data on demand — only when specific conditions
are met — and receive the decrypted result in a callback one block later.

In practice: when you call `transfer`, `wrap`, or `unwrap`, the SDK submits a CTX. The network's
validator committee decrypts the encrypted arguments and delivers the result to the contract's
`onDecrypt` callback in the next block via an ephemeral wallet.

```
Block N:    Your tx calls submitCTX(encryptedArgs)
Block N+1:  Ephemeral wallet calls onDecrypt(decryptedArgs) → balances updated
```

This two-step nature means:
- **`await token.transfer(...)`** resolves as soon as the origin tx is submitted (intent submitted).
- **`await token.transfer(...).waitForCtx()`** waits for the callback too (balance actually updated).

> Learn more: https://docs.skale.space/developers/programmable-privacy/conditional-transactions

## Encrypted Transfer Flow

Here is what happens end-to-end when you call `token.transfer(to, amount)`:

```
1. SDK: ABI-encode (holder, amount) → valuePayload
2. SDK: BITE.encryptMessageForCTX(valuePayload, contractAddress) → encryptedValue
3. SDK: call encryptedTransfer(to, encryptedValue) with CTX fee attached as msg.value

   ── Block N mined ──────────────────────────────────────────────────────────────────

4. Contract: validates encryptedValue format
5. Contract: calls submitCTX(encryptedValue) → ephemeral wallet address returned

   ── Between blocks: validator committee decrypts ──────────────────────────────────

6. Block N+1: ephemeral wallet calls onDecrypt(decryptedArgs)
7. Contract: decodes amount from decryptedArgs, updates sender & receiver balances
8. Contract: re-encrypts updated balances for each holder
9. Contract: emits EncryptedTransfer(transferId, from, to, encryptedData)

`waitForCtx()` waits for step 6–9. The `ctxReceipt` it returns contains the `EncryptedTransfer`
event with the final `transferId`, which is needed for historic decryption.

## How the SDK handles CTX

The SDK abstracts the two-block CTX lifecycle behind familiar async patterns.

### CtxPromise

Methods that produce a CTX return a `CtxPromise` — a plain `Promise<Hex>` augmented with
`.waitForCtx()`:

```ts
// Resolves quickly with the origin hash once the tx is submitted:
const originHash = await token.transfer(to, amount);

// Resolves with CtxResult once the CTX callback is also mined:
const { originHash, originReceipt, ctxHash, ctxReceipt } =
  await token.transfer(to, amount).waitForCtx();
```

Only `transfer`, `wrap`, and `unwrap` return `CtxPromise`. All other write methods return
`Promise<Hex>` (plain origin hash).

### CtxResult

`waitForCtx()` resolves with a `CtxResult` containing both the origin and callback transactions:

| Field | Type | Description |
|-------|------|-------------|
| `originHash` | `Hex` | Transaction hash of the original call (block N) |
| `originReceipt` | `TransactionReceipt` | Full receipt of the origin transaction, including logs emitted at submission |
| `ctxHash` | `Hex` | Transaction hash of the callback delivered by the ephemeral wallet (block N+1) |
| `ctxReceipt` | `TransactionReceipt` | Full receipt of the callback transaction — contains events like `EncryptedTransfer` with the final `transferId` |

## Viewer Keys

Balances and transfer amounts are encrypted on-chain. To decrypt them you need a **viewer keypair**:
an secp256k1 keypair derived deterministically from a wallet signature.

```ts
const signature = await wallet.signMessage("SKALE Privacy Viewer Key");
const { privateKey, publicKey } = deriveViewerKeypair(signature);
```

### Registration

Before others can grant you view access, you must register your public key on-chain:

```ts
await token.registerViewerPublicKey(publicKey);
```

### Decrypting your own balance

```ts
token.setViewerPrivateKey(privateKey);
const balance = await token.decryptBalance();
```

### Decrypting a historic transfer

```ts
// 1. Request the network to re-encrypt the transfer for your viewer key:
const data = await token.requestTransferDecryption(ctxHash);
// data: { from, to, value, timestamp, transferId }
```

You may also grant another address time-range or per-transfer view access:

```ts
await token.authorizeHistoricViewForRange(viewerAddress, fromTimestamp, toTimestamp);
await token.authorizeHistoricViewForTransfer(viewerAddress, transferId);
await token.revokeHistoricView(viewerAddress);
```

## Three-layer architecture

| Layer | Entry point | Responsibility |
|-------|-------------|----------------|
| **Facades** | `"@skalenetwork/privacy-sdk"` | Stateful classes (`ConfidentialToken`, `ConfidentialWrapper`) — the main user-facing API |
| **Actions** | `"@skalenetwork/privacy-sdk/actions"` | Stateless async functions — use these if you prefer to manage config yourself |
| **Utils** | `"@skalenetwork/privacy-sdk/utils"` | Crypto primitives, viewer-key derivation, CTX helpers |

You only need to import from the root package for typical use cases.
