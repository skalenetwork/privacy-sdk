# SKALE Programmable Privacy

Monorepo for SKALE Programmable Privacy tooling — general-purpose on-chain confidentiality with encrypted transactions, confidential computation, and selective disclosure. Confidential tokens (encrypted ERC-20 transfers) are the flagship application built on it.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@skalenetwork/privacy-sdk`](packages/sdk) | [![npm](https://img.shields.io/npm/v/@skalenetwork/privacy-sdk)](https://www.npmjs.com/package/@skalenetwork/privacy-sdk) | TypeScript SDK — core classes and actions |
| [`@skalenetwork/privacy-mcp`](packages/mcp) | [![npm](https://img.shields.io/npm/v/@skalenetwork/privacy-mcp)](https://www.npmjs.com/package/@skalenetwork/privacy-mcp) | MCP server — AI agent integration via Model Context Protocol |

## How it works

SKALE stores token balances and transfer amounts encrypted on-chain. A Conditional Transaction (CTX) lets smart contracts decrypt data on demand — only when specific conditions are met — with the result delivered in a callback one block later.

```
Block N:    Your tx → submitCTX(encryptedArgs)
Block N+1:  Ephemeral wallet → onDecrypt(decryptedArgs) → balances updated
```

The SDK abstracts this two-block lifecycle. The MCP server exposes it as intent-based tools that AI agents can call directly.

## Repository structure

```
packages/
├── sdk/      @skalenetwork/privacy-sdk  — core TypeScript SDK
└── mcp/      @skalenetwork/privacy-mcp  — MCP server for AI agents
docs/         High-level overview, concepts, and glossary
```

## Development

```bash
# Install all workspace dependencies
pnpm install

# Build all packages
pnpm build

# Test all packages
pnpm test

# Build a single package
pnpm --filter @skalenetwork/privacy-sdk build
pnpm --filter @skalenetwork/privacy-mcp build
```

## Docs

Start with the [docs entrypoint](docs/README.md), or jump to:

- [Overview](docs/overview.md) — the three-layer stack and every building block
- [Concepts](docs/concepts.md) — CTX lifecycle, encrypted transfer flow, viewer keys
- [Glossary](docs/glossary.md) — one-line definitions

Package-specific references live with each package: [SDK docs](packages/sdk/docs), [MCP README](packages/mcp/README.md).

## Learn more

- [SKALE Programmable Privacy docs](https://docs.skale.space/developers/programmable-privacy/)