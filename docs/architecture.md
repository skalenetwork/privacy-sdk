# Architecture

```
@skalenetwork/privacy-sdk
├── .              → Facade classes, ABI, types
├── ./actions      → Tree-shakable stateless functions
└── ./utils        → Crypto, CTX, viewer key utilities
```

## Layers

| Layer | Import | What it gives you |
|-------|--------|-------------------|
| **Facades** | `@skalenetwork/privacy-sdk` | `ConfidentialToken`, `ConfidentialWrapper` — stateful classes that hold RPC client, signer, and viewer key. The main user-facing API. |
| **Actions** | `@skalenetwork/privacy-sdk/actions` | Standalone `async` functions (`transfer`, `wrap`, `approve`, etc.) that take an `ActionConfig`. Use for tree-shaking or custom orchestration. |
| **Utils** | `@skalenetwork/privacy-sdk/utils` | Low-level primitives — CTX polling, ECIES decryption, viewer key derivation. |

## When to use which

- **Most apps** → import from the root (`ConfidentialWrapper`). It manages RPC, BITE, and CTX fee logic internally.
- **Custom orchestration** → import individual actions; you supply the `ActionConfig`.
- **Library authors / advanced** → import utils directly for crypto or CTX helpers.
