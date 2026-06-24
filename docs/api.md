# API Reference

## `ConfidentialToken`

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

## `ConfidentialWrapper` (extends `ConfidentialToken`)

| Method | Returns | Description |
|--------|---------|-------------|
| `underlying()` | `Promise<Hex>` | Address of the underlying plain ERC-20 |
| `wrap(receiver, amount)` | `CtxPromise` | Deposit ERC-20 → confidential token |
| `unwrap(receiver, amount)` | `CtxPromise` | Withdraw confidential → ERC-20 |

## `CtxPromise`

Methods that trigger a CTX (`transfer`, `wrap`, `unwrap`) return a `CtxPromise`:

```typescript
// Resolves to origin tx hash:
const hash: Hex = await token.transfer(to, amount);

// Resolves to full CTX result:
const { originHash, originReceipt, ctxHash, ctxReceipt } =
  await token.transfer(to, amount).waitForCtx();
```

## Types

```typescript
type ConfidentialTokenConfig = {
  rpcUrl: string;
  address: Hex;
  signer: Signer;
  viewerPrivateKey?: Hex;
};

type Signer = {
  address: Hex;
  sendTransaction(tx: { to: Hex; data: Hex; value?: bigint }): Promise<Hex>;
};

type CtxResult = {
  originHash: Hex;
  originReceipt: TransactionReceipt;
  ctxHash: Hex;
  ctxReceipt: TransactionReceipt;
};

type TransferData = { from: Hex; to: Hex; value: bigint; timestamp: bigint; transferId: bigint };

type ViewerKeypair = { privateKey: Hex; publicKey: Hex; x: Hex; y: Hex };
```

## Utils (`@skalenetwork/privacy-sdk/utils`)

| Function | Description |
|----------|-------------|
| `deriveViewerKeypair(signature)` | Derive viewer keypair from a signed message |
| `deriveAddressFromPublicKey(publicKey)` | Derive Ethereum address from public key |
| `parsePublicKeyCoordinates(publicKey)` | Split uncompressed key into `{ x, y }` |
| `validateViewerKey(publicKey, expectedAddress?)` | Validate key matches on-chain viewer address |
| `waitForCtx(txHash, publicClient)` | Wait for CTX callback, returns `CtxResult` |
| `getCtxHash(publicClient, txHash)` | Resolve CTX hash for an origin tx |
| `getCtxHashes(publicClient, txHash)` | Resolve all CTX hashes for an origin tx |
| `decryptBalance(encryptedHex, viewerKey)` | Low-level balance decryption |
| `decryptTransferData(encryptedHex, viewerKey)` | Low-level transfer data decryption |
| `decryptEciesPayload(payload, privateKey)` | Raw ECIES decryption |

## Actions (`@skalenetwork/privacy-sdk/actions`)

All take `ActionConfig` as first argument. Returns `Promise<Hex>` (tx hash).

| Function | Params |
|----------|--------|
| `approve(config, spender, amount)` | ERC-20 approve |
| `transfer(config, to, amount)` | Encrypted transfer |
| `wrap(config, receiver, amount)` | Deposit ERC-20 → confidential |
| `unwrap(config, receiver, amount)` | Withdraw confidential → ERC-20 |
| `getCtxBalance(config)` | Returns `Promise<bigint>` — CTX gas balance |
| `getCtxFee(config)` | Returns `Promise<bigint>` — CTX callback fee |
| `getValueForCtx(config)` | Returns `Promise<bigint>` — required `msg.value` for CTX |
| `decryptTokenBalance(config, viewerKey)` | Returns `Promise<bigint>` |
| `getTransferId(config, ctxHash)` | Returns `Promise<bigint>` |
| `registerViewerKey(config, publicKey)` | Register viewer key |
| `authorizeHistoricViewForRange(config, address, fromTimestamp, toTimestamp)` | Grant time-range access |
| `authorizeHistoricViewForTransfer(config, address, transferId)` | Grant per-transfer access |
| `revokeHistoricView(config, address)` | Revoke historic view |
| `requestTransferDecryption(config, ctxHash)` | Send re-encryption request |
