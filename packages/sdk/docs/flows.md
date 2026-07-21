# SDK Flows

Practical, code-level walkthroughs for the confidential token flows. For the conceptual mechanics
behind these (why they work, what happens on-chain), see the repo-level
[Concepts](../../../docs/concepts.md).

## Encrypted transfer

A transfer triggers a CTX. The returned `CtxPromise` lets you await either submission or the
second-block callback:

```ts
// Resolves once the origin tx is submitted (intent submitted):
const originHash = await token.transfer(to, amount);

// Resolves once the second-block callback is mined (balance actually updated):
const { originHash, originReceipt, ctxHash, ctxReceipt } =
  await token.transfer(to, amount).waitForCtx();
```

Only `transfer`, `wrap`, and `unwrap` return a `CtxPromise` (a `Promise<Hex>` augmented with
`.waitForCtx()`). All other write methods return a plain `Promise<Hex>`. The `ctxReceipt` contains
the `EncryptedTransfer` event with the final `transferId`, needed for historical decryption.

## Balance decryption

```ts
token.setViewerPrivateKey(privateKey);
const balance = await token.decryptBalance();
```

## Historical transfer decryption

```ts
const data = await token.requestTransferDecryption(ctxHash);
// data: { from, to, value, timestamp, transferId }
```

## Viewer keys

Derive a viewer keypair deterministically from a wallet signature:

```ts
const signature = await wallet.signMessage("SKALE Privacy Viewer Key");
const { privateKey, publicKey } = deriveViewerKeypair(signature);
```

Register your public key on-chain before others can grant you access:

```ts
await token.registerViewerPublicKey(publicKey);
```

Grant another address scoped view access (selective disclosure), or revoke it:

```ts
await token.authorizeHistoricViewForRange(viewerAddress, fromTimestamp, toTimestamp);
await token.authorizeHistoricViewForTransfer(viewerAddress, transferId);
await token.revokeHistoricView(viewerAddress);
```

See [api.md](api.md) for the full method and type reference.
