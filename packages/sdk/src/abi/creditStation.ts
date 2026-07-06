export const creditStationAbi = [
  {
    inputs: [
      { internalType: "string", name: "schainName", type: "string" },
      { internalType: "address", name: "purchaser", type: "address" },
      { internalType: "contract IERC20", name: "token", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "buy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getSupportedTokens",
    outputs: [{ internalType: "address[]", name: "tokens", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "contract IERC20", name: "token", type: "address" }],
    name: "getPrice",
    outputs: [{ internalType: "uint256", name: "price", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const erc20MetaAbi = [
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
