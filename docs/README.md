# SKALE Programmable Privacy — Docs

The entrypoint for understanding SKALE Programmable Privacy: general-purpose on-chain
confidentiality — encrypted transactions, confidential computation, and selective disclosure
enforced at consensus. Confidential tokens (encrypted balances and amounts) are the flagship
application built on it.

Programmable Privacy is a **three-layer stack**. Balances and amounts are stored encrypted on
consensus, smart contracts decrypt them on demand, and libraries make it usable from TypeScript
and AI agents.

```
Libraries & APIs   bite.ts · privacy-sdk · privacy-mcp
Smart contracts    BITE.sol · confidential tokens & wrappers
Protocol           BITE protocol · CTX · encrypTE / encryptECIES precompiles
```

## Start here

| Doc | What it covers |
|-----|----------------|
| [Overview](overview.md) | The three layers and every building block, in one place |
| [Concepts](concepts.md) | How it works: CTX lifecycle, encrypted transfer flow, viewer keys |
| [Glossary](glossary.md) | One-line definitions of every term |

## Packages

| Package | Layer | Docs |
|---------|-------|------|
| [`@skalenetwork/privacy-sdk`](../packages/sdk) | Libraries | [SDK docs](../packages/sdk/docs) |
| [`@skalenetwork/privacy-mcp`](../packages/mcp) | Libraries | [MCP README](../packages/mcp/README.md) |

## Building blocks

Source repositories for each building block, by layer:

| Building block | Layer | Source |
|----------------|-------|--------|
| BITE | Protocol | [SKALE BITE docs](https://docs.skale.space/developers/bite) |
| bite-solidity | Contracts | [github.com/skalenetwork/bite-solidity](https://github.com/skalenetwork/bite-solidity) — Solidity helpers for BITE |
| confidential-token | Contracts | [github.com/skalenetwork/confidential-token](https://github.com/skalenetwork/confidential-token) — confidential ERC-20 |
| bite-ts | Libraries | [github.com/skalenetwork/bite-ts](https://github.com/skalenetwork/bite-ts) — TypeScript library for BITE |
| privacy-sdk | Libraries | [packages/sdk](../packages/sdk) — this repo |
| privacy-mcp | Libraries | [packages/mcp](../packages/mcp) — this repo |

## Learn more

- [SKALE Programmable Privacy docs](https://docs.skale.space/developers/programmable-privacy/)
