import readline from "node:readline";
import { createWalletClient, http, isAddressEqual, zeroAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ConfidentialToken, viewerPublicKey, deriveViewerKeypair } from "@skalenetwork/privacy-sdk";
import { prompt } from "./prompt.js";

export function makeToken(rpcUrl: string, wrapperAddress: Hex, signerKey: Hex): ConfidentialToken {
  const account = privateKeyToAccount(signerKey);
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) });
  return new ConfidentialToken({
    rpcUrl,
    address: wrapperAddress,
    signer: {
      address: account.address,
      sendTransaction: (tx) => walletClient.sendTransaction({ ...tx, chain: null }),
    },
  });
}

export async function resolveViewerKey(
  rl: readline.Interface,
  rpcUrl: string,
  wrapperAddress: Hex,
  signerKey: Hex,
): Promise<string | undefined> {
  console.log("\nChecking viewer key registration...");
  const token = makeToken(rpcUrl, wrapperAddress, signerKey);
  const registeredViewer = await token.viewerAddress();
  const hasViewer = !isAddressEqual(registeredViewer, zeroAddress);

  if (hasViewer) {
    console.log(`Viewer registered for this wallet: ${registeredViewer}`);
    const input = await prompt(
      rl,
      "Enter the corresponding viewer private key (0x..., press Enter to skip): ",
    );
    const viewerKey = input.trim();
    if (!viewerKey) return undefined;

    const derivedAddress = privateKeyToAccount(viewerKey as Hex).address;
    if (!isAddressEqual(derivedAddress, registeredViewer)) {
      console.warn("⚠ Viewer private key does not match the registered viewer address. Skipping.");
      return undefined;
    }
    return viewerKey;
  }

  // No viewer registered
  console.log("No viewer key registered for this wallet.");
  console.log("  [1] Enter a viewer private key");
  console.log("  [2] Generate one via wallet signature (deterministic)");
  console.log("  [3] Skip (balance decryption will not be available)");
  const choice = (await prompt(rl, "Choice [1/2/3]: ")).trim();

  if (choice === "1") {
    const input = (await prompt(rl, "Viewer private key (0x...): ")).trim() as Hex;
    const viewerPrivateKey = input;
    console.log("Registering viewer key on-chain...");
    await token.registerViewerPublicKey(viewerPublicKey(viewerPrivateKey));
    console.log("Viewer key registered.");
    return viewerPrivateKey;
  }

  if (choice === "2") {
    const walletClient = createWalletClient({
      account: privateKeyToAccount(signerKey),
      transport: http(rpcUrl),
    });
    const sig = await walletClient.signMessage({ message: "SKALE Privacy Viewer Key" });
    const { privateKey: viewerPrivateKey } = deriveViewerKeypair(sig);
    console.log("Registering viewer key on-chain...");
    await token.registerViewerPublicKey(viewerPublicKey(viewerPrivateKey));
    console.log("Viewer key registered.");
    return viewerPrivateKey;
  }

  console.log("Skipping viewer key.");
  return undefined;
}
