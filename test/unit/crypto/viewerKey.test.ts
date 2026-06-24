import { describe, it, expect } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex, hexToBytes, keccak256, type Hex } from "viem";

import {
  deriveViewerKeypair,
  parsePublicKeyCoordinates,
  deriveAddressFromPublicKey,
  validateViewerKey,
} from "../../../src/utils/viewerKey.ts";

describe("parsePublicKeyCoordinates", () => {
  it("parses uncompressed key with 0x04 prefix", () => {
    const priv = hexToBytes(("0x" + "ab".repeat(32)) as Hex);
    const pub = bytesToHex(secp256k1.getPublicKey(priv, false)); // 65 bytes, starts 04

    const { x, y } = parsePublicKeyCoordinates(pub as Hex);

    expect(x).toMatch(/^0x[0-9a-f]{64}$/);
    expect(y).toMatch(/^0x[0-9a-f]{64}$/);
    // Reconstruct
    expect(`0x04${x.slice(2)}${y.slice(2)}`).toBe(pub);
  });

  it("throws on invalid length", () => {
    expect(() => parsePublicKeyCoordinates("0x04aabb" as Hex)).toThrow();
  });
});

describe("deriveAddressFromPublicKey", () => {
  it("derives correct address from uncompressed public key", () => {
    // Known test vector: private key -> public key -> address
    const privKey = "0x4c0883a69102937d6231471b5dbb6204fe512961708279f23efb3c4e5e8e5c3a" as Hex;
    const pubKey = bytesToHex(secp256k1.getPublicKey(hexToBytes(privKey), false));

    const address = deriveAddressFromPublicKey(pubKey as Hex);

    // keccak256 of the 64 raw bytes, take last 20 bytes
    const rawPubHex = `0x${pubKey.slice(4)}` as Hex;
    const expected = `0x${keccak256(hexToBytes(rawPubHex)).slice(-40)}`;
    expect(address.toLowerCase()).toBe(expected.toLowerCase());
  });
});

describe("validateViewerKey", () => {
  it("returns undefined when addresses match", () => {
    const privKey = ("0x" + "cd".repeat(32)) as Hex;
    const pubKey = bytesToHex(secp256k1.getPublicKey(hexToBytes(privKey), false));
    const expectedAddr = deriveAddressFromPublicKey(pubKey as Hex);

    const error = validateViewerKey(pubKey as Hex, expectedAddr);
    expect(error).toBeUndefined();
  });

  it("returns error when addresses don't match", () => {
    const privKey = ("0x" + "cd".repeat(32)) as Hex;
    const pubKey = bytesToHex(secp256k1.getPublicKey(hexToBytes(privKey), false));

    const error = validateViewerKey(
      pubKey as Hex,
      "0x0000000000000000000000000000000000000001" as Hex,
    );
    expect(error).toContain("does not match");
  });

  it("returns undefined for zero address (no viewer registered)", () => {
    const privKey = ("0x" + "cd".repeat(32)) as Hex;
    const pubKey = bytesToHex(secp256k1.getPublicKey(hexToBytes(privKey), false));

    const error = validateViewerKey(
      pubKey as Hex,
      "0x0000000000000000000000000000000000000000" as Hex,
    );
    expect(error).toBeUndefined();
  });
});

describe("deriveViewerKeypair", () => {
  it("produces a valid keypair deterministically", () => {
    const signature = ("0x" + "af".repeat(65)) as Hex;
    const kp = deriveViewerKeypair(signature);

    expect(kp.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(kp.publicKey).toMatch(/^0x04[0-9a-f]{128}$/);
    expect(kp.x).toMatch(/^0x[0-9a-f]{64}$/);
    expect(kp.y).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic (same signature → same keypair)", () => {
    const signature = ("0x" + "be".repeat(65)) as Hex;
    const kp1 = deriveViewerKeypair(signature);
    const kp2 = deriveViewerKeypair(signature);

    expect(kp1).toEqual(kp2);
  });

  it("different signatures produce different keys", () => {
    const kp1 = deriveViewerKeypair(("0x" + "aa".repeat(65)) as Hex);
    const kp2 = deriveViewerKeypair(("0x" + "bb".repeat(65)) as Hex);

    expect(kp1.privateKey).not.toBe(kp2.privateKey);
  });
});
