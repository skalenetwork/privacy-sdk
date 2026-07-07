import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { creditStationAbi, erc20MetaAbi } from "./abi/creditStation.js";

const erc20ApproveAbi = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface CreditStationConfig {
  beaconRpcUrl: string;
  address: Hex;
  privateKey: Hex;
}

export interface CreditPrice {
  token: Hex;
  symbol: string;
  decimals: number;
  pricePerCredit: string;
}

export interface BuyResult {
  approveTxHash: Hex;
  buyTxHash: Hex;
  schainName: string;
  purchaser: Hex;
  token: Hex;
  amount: string;
}

export class CreditStation {
  private readonly address: Hex;
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient;
  private readonly account: ReturnType<typeof privateKeyToAccount>;

  constructor(config: CreditStationConfig) {
    this.address = config.address;
    this.account = privateKeyToAccount(config.privateKey);
    this.publicClient = createPublicClient({
      transport: http(config.beaconRpcUrl),
    }) as PublicClient;
    this.walletClient = createWalletClient({
      account: this.account,
      transport: http(config.beaconRpcUrl),
    });
  }

  async getCreditPrices(): Promise<CreditPrice[]> {
    const tokens = (await this.publicClient.readContract({
      address: this.address,
      abi: creditStationAbi,
      functionName: "getSupportedTokens",
    })) as Hex[];

    return Promise.all(
      tokens.map(async (token) => {
        const [price, symbol, decimals] = await Promise.all([
          this.publicClient.readContract({
            address: this.address,
            abi: creditStationAbi,
            functionName: "getPrice",
            args: [token],
          }) as Promise<bigint>,
          this.publicClient
            .readContract({ address: token, abi: erc20MetaAbi, functionName: "symbol" })
            .catch(() => "UNKNOWN") as Promise<string>,
          this.publicClient
            .readContract({ address: token, abi: erc20MetaAbi, functionName: "decimals" })
            .catch(() => 18) as Promise<number>,
        ]);

        return {
          token,
          symbol,
          decimals,
          pricePerCredit: price.toString(),
        };
      }),
    );
  }

  async buy(amount: bigint, tokenAddress: Hex, schainName: string): Promise<BuyResult> {
    const price = (await this.publicClient.readContract({
      address: this.address,
      abi: creditStationAbi,
      functionName: "getPrice",
      args: [tokenAddress],
    })) as bigint;

    const totalCost = price * amount;
    const purchaser = this.account.address as Hex;

    const approveTxHash = await this.walletClient.writeContract({
      address: tokenAddress,
      abi: erc20ApproveAbi,
      functionName: "approve",
      args: [this.address, totalCost],
      account: this.account,
      chain: null,
    });

    const approveReceipt = await this.publicClient.waitForTransactionReceipt({ hash: approveTxHash });
    if (approveReceipt.status !== "success") {
      throw new Error(`ERC-20 approve transaction reverted: ${approveTxHash}`);
    }

    const buyTxHash = await this.walletClient.writeContract({
      address: this.address,
      abi: creditStationAbi,
      functionName: "buy",
      args: [schainName, purchaser, tokenAddress, amount],
      account: this.account,
      chain: null,
    });

    const buyReceipt = await this.publicClient.waitForTransactionReceipt({ hash: buyTxHash });
    if (buyReceipt.status !== "success") {
      throw new Error(`CreditStation buy transaction reverted: ${buyTxHash}`);
    }

    return {
      approveTxHash,
      buyTxHash,
      schainName,
      purchaser,
      token: tokenAddress,
      amount: amount.toString(),
    };
  }
}
