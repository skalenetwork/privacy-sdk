import { describe, it, expect } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { cbc } from "@noble/ciphers/aes";
import { bytesToHex, hexToBytes, encodeAbiParameters, type Hex } from "viem";

import { decryptBalance, decryptTransferData } from "../../../src/utils/crypto.ts";

// Helper: encrypt using ECIES (mirrors the contract/BITE encryption logic)
function eciesEncrypt(publicKeyHex: Hex, plaintext: Uint8Array): Hex {
  const ephemeralPriv = secp256k1.utils.randomPrivateKey();
  const ephemeralPub = secp256k1.getPublicKey(ephemeralPriv, true); // 33 bytes compressed

  const recipientPub = hexToBytes(publicKeyHex);
  const sharedSecret = secp256k1.getSharedSecret(ephemeralPriv, recipientPub, true);
  const encryptionKey = sha256(sharedSecret.slice(1));

  const iv = crypto.getRandomValues(new Uint8Array(16));
  const ciphertext = cbc(Uint8Array.from(encryptionKey), iv).encrypt(plaintext);

  // Layout: iv (16) | compressedEphemeralPub (33) | ciphertext
  const payload = new Uint8Array(16 + 33 + ciphertext.length);
  payload.set(iv, 0);
  payload.set(ephemeralPub, 16);
  payload.set(ciphertext, 49);

  return bytesToHex(payload);
}

// Generate a test keypair
const insecurePrivateKey: Hex =
  "0x4c0883a69102937d6231471b5dbb6204fe512961708279f23efb3c4e5e8e5c3a";
const publicKey = bytesToHex(secp256k1.getPublicKey(hexToBytes(insecurePrivateKey), true));

describe("decryptBalance", () => {
  it("decrypts a 32-byte balance correctly", async () => {
    const amount = 123456789n;
    const plaintext = hexToBytes(`0x${amount.toString(16).padStart(64, "0")}`);

    const encrypted = eciesEncrypt(publicKey as Hex, plaintext);
    const result = await decryptBalance(encrypted, insecurePrivateKey);

    expect(result).toBe(amount);
  });

  it("decrypts zero balance", async () => {
    const plaintext = new Uint8Array(32); // all zeros
    const encrypted = eciesEncrypt(publicKey as Hex, plaintext);
    const result = await decryptBalance(encrypted, insecurePrivateKey);

    expect(result).toBe(0n);
  });

  it("decrypts large balance", async () => {
    const amount = 2n ** 128n - 1n;
    const plaintext = hexToBytes(`0x${amount.toString(16).padStart(64, "0")}`);

    const encrypted = eciesEncrypt(publicKey as Hex, plaintext);
    const result = await decryptBalance(encrypted, insecurePrivateKey);

    expect(result).toBe(amount);
  });
});

describe("decryptTransferData", () => {
  it("decrypts ABI-encoded transfer struct", async () => {
    const from = "0x1111111111111111111111111111111111111111" as Hex;
    const to = "0x2222222222222222222222222222222222222222" as Hex;
    const value = 500n;
    const timestamp = 1700000000n;
    const transferId = 42n;

    const encoded = encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      [from, to, value, timestamp, transferId],
    );

    const plaintext = hexToBytes(encoded);
    const encrypted = eciesEncrypt(publicKey as Hex, plaintext);
    const result = await decryptTransferData(encrypted, insecurePrivateKey);

    expect(result.from.toLowerCase()).toBe(from.toLowerCase());
    expect(result.to.toLowerCase()).toBe(to.toLowerCase());
    expect(result.value).toBe(value);
    expect(result.timestamp).toBe(timestamp);
    expect(result.transferId).toBe(transferId);
  });

  it("throws on invalid payload", async () => {
    // Encrypt random garbage that won't decode as TransferData
    const garbage = crypto.getRandomValues(new Uint8Array(48));
    const encrypted = eciesEncrypt(publicKey as Hex, garbage);

    await expect(decryptTransferData(encrypted, insecurePrivateKey)).rejects.toThrow();
  });
});
