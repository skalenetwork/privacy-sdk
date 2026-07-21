# Overview

SKALE Programmable Privacy is **general-purpose on-chain confidentiality**: encrypted transactions,
confidential computation, and selective disclosure enforced at the consensus layer. Privacy is not
an add-on or a mixer — it is built into the protocol, the contracts, and the tooling, so smart
contracts define who sees what and when.

Confidential tokens (encrypted balances and amounts) are one application built on this foundation —
the one this repository focuses on — but the underlying capabilities apply to any private on-chain
state: sealed-bid auctions, private voting, hidden game state, confidential agent transactions, and
more.

This page maps every building block across the three layers of the stack. For how these pieces
work together at runtime, see [Concepts](concepts.md); for definitions, see [Glossary](glossary.md).

## The three-layer stack

```
Libraries & APIs   bite.ts · privacy-sdk · privacy-mcp        ← how you build with it
Smart contracts    BITE.sol · confidential tokens & wrappers  ← what runs on-chain
Protocol           BITE · CTX · precompiles                    ← how privacy is enforced
```

Each layer builds on the one below it. You typically work at the **Libraries** layer; the layers
beneath explain how and why it works.

## Protocol level

The consensus-level foundation. This is what makes state private in the first place. It is made up
of three building blocks.

- **BITE** — a general-purpose threshold-encryption engine built into consensus. It is the
  cryptographic foundation of Programmable Privacy, and it is **not limited to token balances**: a
  validator committee jointly holds decryption keys under threshold cryptography, so no single party
  can read private state. BITE powers encrypted transactions (payloads hidden in the mempool and
  consensus, for MEV resistance), on-demand decryption, confidential tokens, and re-encryption for
  selective disclosure. It is one part of the protocol level, alongside CTX and the precompiles.
- **Conditional Transactions (CTX)** — the mechanism that lets a smart contract request decryption
  of specific encrypted data *on demand*. The decrypted result is delivered back to the contract in
  a callback one block later. This is the two-block lifecycle every confidential operation rides on.
- **Precompiles (`encrypTE` + `encryptECIES`)** — predeployed contracts that provide the encryption
  primitives: `encrypTE` for threshold encryption tied to CTX, `encryptECIES` for ECIES encryption
  (used by viewer keys for selective disclosure).

## Smart-contract level

The on-chain programs that consume the protocol primitives.

- **`BITE.sol`** — the Solidity gateway to the protocol. Contracts use it to submit a CTX
  (`submitCTX`) and receive decrypted results in an `onDecrypt` callback. It is how any contract
  becomes privacy-aware.
- **Confidential tokens & wrappers** — encrypted-balance ERC-20 tokens, plus wrappers that convert
  plain ERC-20 tokens into their confidential form and back (`wrap` / `unwrap`). Balances and
  transfer amounts are stored and updated encrypted; transfers emit encrypted events.

## Library & API level

The developer-facing tooling. This is where you build.

- **`bite.ts`** — the low-level TypeScript library for the encryption primitives (e.g.
  `encryptMessageForCTX`). Both the SDK and contract tooling depend on it.
- **`privacy-sdk`** (`@skalenetwork/privacy-sdk`) — the high-level TypeScript SDK. Provides
  stateful classes (`ConfidentialToken`, `ConfidentialWrapper`) that abstract the two-block CTX
  lifecycle behind familiar async patterns. This is the main entry point for most developers.
- **`privacy-mcp`** (`@skalenetwork/privacy-mcp`) — an MCP server that exposes confidential
  operations as intent-based tools (`send_private_payment`, `check_private_balance`, …) that AI
  agents can call directly, with no blockchain knowledge required.

## Cross-cutting: viewer keys

Because state is encrypted, reading your own balance or revealing a past transfer requires a
**viewer key** — a keypair that grants decryption access. Viewer keys also enable **selective
disclosure**: you can grant a specific party scoped view access (a single transfer or a time range)
without exposing the rest of your history. See [Concepts → Viewer Keys](concepts.md#viewer-keys).

## Where to go next

- Building an app or agent? → [`privacy-sdk`](../packages/sdk) or [`privacy-mcp`](../packages/mcp)
- Want the runtime mechanics? → [Concepts](concepts.md)
- Need a term defined? → [Glossary](glossary.md)
