# @skalenetwork/privacy-mcp

[![npm](https://img.shields.io/npm/v/@skalenetwork/privacy-mcp)](https://www.npmjs.com/package/@skalenetwork/privacy-mcp)

MCP server for SKALE Programmable Privacy — enables AI agents to execute confidential token operations through the [Model Context Protocol](https://modelcontextprotocol.io).

## What it does

Exposes SKALE confidential token operations as MCP tools. AI agents (Claude, Copilot, Cursor, ChatGPT, and any MCP-compatible client) can discover and invoke these tools directly — no knowledge of encryption, CTX lifecycles, or key management required.

## Install

```bash
npm install @skalenetwork/privacy-mcp
```

Or run directly without installing:

```bash
npx @skalenetwork/privacy-mcp
```

## Quick setup

```bash
npx @skalenetwork/privacy-mcp init
```

Prompts for your private key and writes the config file automatically. Use `--client` to target a specific AI client:

```bash
npx @skalenetwork/privacy-mcp init --client vscode   # writes .vscode/mcp.json
npx @skalenetwork/privacy-mcp init --client claude   # writes claude_desktop_config.json
npx @skalenetwork/privacy-mcp init --client cursor   # prints config to stdout
```

The default network is `testnet`. Use `--network` to override (more networks coming):

```bash
npx @skalenetwork/privacy-mcp init --network testnet
```

## Configuration

The server is configured via environment variables:

| Variable | Required | Description |
|----------|----------|--------------|
| `SKALE_PRIVATE_KEY` or `PRIVATE_KEY` | **yes** | Private key for signing transactions (`0x...`) |
| `SKALE_VIEWER_PRIVATE_KEY` or `VIEWER_PRIVATE_KEY` | no | Viewer private key for balance decryption (`check_private_balance`) |

Advanced overrides: `SKALE_RPC_URL`, `SKALE_WRAPPER_ADDRESS`, `BEACON_RPC_URL`, `CREDIT_STATION_ADDRESS`, `SKALE_CHAIN_NAME`.

### Supported networks

| Name | Chain | RPC |
|------|-------|-----|
| `testnet` | SKALE Base Sepolia | `https://base-sepolia-testnet.skalenodes.com/v1/base-testnet` |

## Tools

### `send_private_payment`
Send a confidential encrypted transfer to a recipient. Amount and balances remain hidden on-chain.

| Input | Type | Description |
|-------|------|-------------|
| `to` | `string` | Recipient address (`0x...`) |
| `amount` | `string` | Amount in token base units (e.g. `"1000000"` for 1 USDC with 6 decimals) |

---

### `check_private_balance`
Decrypt and return the current confidential token balance for the configured wallet.

No inputs. Requires `SKALE_VIEWER_PRIVATE_KEY` / `VIEWER_PRIVATE_KEY` to be set.

---

### `wrap_tokens`
Deposit plain ERC-20 tokens into their confidential (encrypted) form. Requires prior ERC-20 `approve` on the underlying token.

| Input | Type | Description |
|-------|------|-------------|
| `receiver` | `string` | Receiver address for the wrapped tokens (`0x...`) |
| `amount` | `string` | Amount to wrap in token base units |

---

### `unwrap_tokens`
Withdraw confidential tokens back into plain ERC-20 tokens.

| Input | Type | Description |
|-------|------|-------------|
| `receiver` | `string` | Receiver address for the unwrapped ERC-20 tokens (`0x...`) |
| `amount` | `string` | Amount to unwrap in token base units |

---

### `reveal_transfer`
Decrypt a historic confidential transfer to reveal its details (from, to, amount, timestamp).

| Input | Type | Description |
|-------|------|-------------|
| `ctxHash` | `string` | CTX transaction hash of the transfer to decrypt (`0x...`) |

---

### `confidential_wallet_info`
Return the configured wallet address, confidential token balance, and token metadata in a single call.

No inputs. Requires `SKALE_VIEWER_PRIVATE_KEY` / `VIEWER_PRIVATE_KEY` to be set for balance decryption. Returns `address`, `confidential_token_balance`, and a `token` object with `name`, `symbol`, `decimals`, `underlying` ERC-20 address, and `wrapperAddress`.

---

### `get_credit_price`
Get the price of 1 CREDIT for each supported payment token on the CreditStation contract (beacon chain).

No inputs. Returns an array of `{ token, symbol, decimals, pricePerCredit }`.

---

### `buy_credits`
Buy credits on the configured SKALE chain via CreditStation on the beacon chain. Handles ERC-20 approval automatically.

| Input | Type | Description |
|-------|------|-------------|
| `amount` | `string` | Number of credits to purchase (e.g. `"10"`) |
| `token` | `string` | ERC-20 token address to pay with (`0x...`) — use `get_credit_price` to find accepted tokens |
| `schainName` | `string` | *(optional)* SKALE chain name to buy credits for (defaults to configured network) |

## Integration with AI clients

### VS Code (Copilot Agent)

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "programmable-privacy": {
      "type": "stdio",
      "command": "npx",
      "args": ["@skalenetwork/privacy-mcp"],
      "env": {
        "SKALE_PRIVATE_KEY": "0x...",
        "VIEWER_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

> `VIEWER_PRIVATE_KEY` is optional but required for `check_private_balance`.

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "programmable-privacy": {
      "command": "npx",
      "args": ["@skalenetwork/privacy-mcp"],
      "env": {
        "SKALE_PRIVATE_KEY": "0x...",
        "VIEWER_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

> `VIEWER_PRIVATE_KEY` is optional but required for `check_private_balance`.

### Cursor / other MCP clients

Use `stdio` transport with `npx @skalenetwork/privacy-mcp` as the command and pass env vars as shown above.

## Programmatic usage

Embed the server directly in a Node.js application:

```typescript
import { createServer } from "@skalenetwork/privacy-mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Local testing with MCP Inspector

```bash
export PRIVATE_KEY=0x...

npx @modelcontextprotocol/inspector npx @skalenetwork/privacy-mcp
```

Opens at `http://localhost:6274` — lists all tools, lets you invoke them with custom args, and shows raw JSON-RPC messages.

## Agent flow

```
Agent calls: send_private_payment({ to: "0xABC", amount: "1000000" })
                        │
              MCP server validates args
              reads config from env
              instantiates ConfidentialWrapper
              executes transfer().waitForCtx()
                        │
              returns: {
                status: "confirmed",
                originHash: "0x...",
                ctxHash: "0x...",
                recipient: "0xABC",
                amount: "1000000"
              }
```

The agent never handles private keys, ciphertext, or the two-block CTX lifecycle.

## Security

- Private keys are read from environment variables and never logged or returned in tool responses
- All tool inputs are validated before execution
- The MCP server process runs locally on the user's machine — keys are never transmitted remotely

## Learn more

- [`@skalenetwork/privacy-sdk`](../sdk) — the underlying SDK
- [SKALE Programmable Privacy](https://docs.skale.space/developers/programmable-privacy/)
- [Model Context Protocol](https://modelcontextprotocol.io)
