# Glossary

Canonical one-line definitions for SKALE Programmable Privacy. See [Overview](overview.md) for how
these fit together and [Concepts](concepts.md) for the runtime mechanics.

| Term | Definition |
|------|------------|
| **BITE** | A part of the protocol level: a general-purpose threshold-encryption engine at consensus, powering encrypted transactions, CTX, confidential tokens, and re-encryption. Not limited to token balances. |
| **CTX (Conditional Transaction)** | A request for on-demand decryption of encrypted data, delivered back to a contract in a callback one block later. |
| **encrypTE** | Predeployed precompile providing threshold encryption tied to the CTX flow. |
| **encryptECIES** | Predeployed precompile providing ECIES encryption, used by viewer keys for selective disclosure. |
| **Re-encryption** | Re-encrypting existing encrypted state for a specific viewer key, so a chosen party can decrypt it — the primitive behind selective disclosure. |
| **`BITE.sol`** | Solidity gateway contract for submitting a CTX (`submitCTX`) and handling its `onDecrypt` callback. |
| **Confidential token** | An ERC-20 whose balances and transfer amounts are stored and updated encrypted on-chain. |
| **Wrapper** | Contract that converts a plain ERC-20 into its confidential form (`wrap`) and back (`unwrap`). |
| **`bite.ts`** | Low-level TypeScript library for the encryption primitives (e.g. `encryptMessageForCTX`). |
| **`privacy-sdk`** | High-level TypeScript SDK with stateful classes that abstract the CTX lifecycle. |
| **`privacy-mcp`** | MCP server exposing confidential operations as tools AI agents can call. |
| **Viewer key** | A keypair that grants decryption access to encrypted state (your balance, a past transfer). |
| **Selective disclosure** | Granting a specific party scoped view access (one transfer or a time range) without exposing full history. |
| **Ephemeral wallet** | A one-time wallet the validator committee uses to deliver a CTX `onDecrypt` callback. |
| **`onDecrypt`** | The contract callback that receives decrypted CTX arguments in the block after submission. |
| **Credits** | Prepaid units that fund gasless confidential operations, purchased via the CreditStation. |
| **CreditStation** | Contract on the beacon chain used to buy credits for a SKALE chain. |
| **transferId** | Identifier emitted with an encrypted transfer, required to decrypt it historically. |
