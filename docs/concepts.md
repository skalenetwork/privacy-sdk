# Concepts

The theory behind confidential tokens: what each flow does, why it stays private, and the protocol
mechanics underneath. This page is conceptual — for code-level usage (method calls, types), see the
SDK [flows](../packages/sdk/docs/flows.md) and [API reference](../packages/sdk/docs/api.md).

For the building blocks and where they sit in the stack, see [Overview](overview.md). For
definitions, see [Glossary](glossary.md).

---

## Confidential token flows

How confidential tokens behave, described at the level of mechanics rather than API.

### Encrypted transfer

A confidential transfer moves value without revealing the amount or either party's balance on-chain.
The sender encrypts the transfer value for the token contract, so the contract never sees plaintext
at submission. One block later — via the [CTX flow](#ctx-flow) — the network decrypts the value,
updates both balances, re-encrypts them, and emits an event referencing an encrypted payload.

```
1. Value is encrypted for the contract and submitted as a CTX
2. Committee decrypts between blocks
3. Contract updates both balances and re-encrypts them
4. Contract emits EncryptedTransfer(transferId, …) with an encrypted payload
```

Nothing observable on-chain reveals the amount or the resulting balances. The `transferId` from the
emitted event is the handle used later for historical decryption.

### Balance decryption

Balances are stored encrypted, so they cannot be read by inspecting chain state. Reading a balance
is a local act: the holder uses their [viewer key](#viewer-keys) to decrypt the encrypted balance
that belongs to them. Without the matching viewer private key, the balance is opaque.

### Historical transfer decryption

A past transfer is stored as an encrypted payload. To reveal its details, the network is asked to
**re-encrypt** that specific transfer for a viewer key (see [Re-encryption flow](#re-encryption-flow)).
The result — sender, recipient, value, timestamp — is then decryptable only by the holder of that
viewer key. This is how a transfer can be audited after the fact without ever having been public.

### Viewer keys

Because state is encrypted, reading it requires a **viewer key** — a keypair that grants decryption
access, derived deterministically from a wallet signature and registered on-chain.

Viewer keys are also the basis of **selective disclosure**: a holder can authorize another party to
view a single transfer or a time range of activity, and later revoke it. Disclosure is scoped and
explicit — by default nothing is visible to anyone else.

---

## Protocol flows

The deeper mechanics, powered by [BITE](overview.md#protocol-level). Every confidential token flow
above rides on these.

### CTX flow

A Conditional Transaction (CTX) lets a contract request decryption of encrypted data on demand and
receive the result in a callback one block later. Between blocks, the validator committee jointly
decrypts under threshold cryptography — no single party can decrypt alone — and delivers the
plaintext to the contract through an ephemeral wallet.

```
Block N:    A tx submits encrypted arguments (submitCTX)
            → validator committee decrypts between blocks
Block N+1:  An ephemeral wallet delivers the result (onDecrypt) → state updated
```

This two-block lifecycle is why a confidential operation has two meaningful moments: *submitted*
(block N) and *settled* (block N+1, when state actually changes).

### Re-encryption flow

Re-encryption takes state that is already encrypted and re-encrypts it for a **specific viewer
key**, so a chosen party — and only that party — can decrypt it. It is the primitive behind balance
decryption and historical transfer decryption.

```
1. A viewer key is registered on-chain (via the encryptECIES precompile)
2. A request targets specific encrypted data (a balance, or a past transfer)
3. The network re-encrypts that data for the requesting viewer key
4. The holder of the matching viewer private key decrypts it locally
```

Selective disclosure is re-encryption scoped by authorization: the holder controls *which* data may
be re-encrypted for *which* viewer.

> Learn more: [Conditional Transactions](https://docs.skale.space/developers/programmable-privacy/conditional-transactions) ·
> [Re-encryption](https://docs.skale.space/developers/programmable-privacy/re-encryption)
