import { type Hex, hexToBytes, isAddressEqual, keccak256, toHex, zeroAddress } from "viem";
import { publicKeyToAddress } from "viem/utils";
import { secp256k1 } from "@noble/curves/secp256k1";

import type { ViewerKeypair } from "../types.js";

function privateKeyFromSignature(signature: Hex): Hex {
  let candidate = keccak256(hexToBytes(signature));

  for (let i = 0; i < 16; i += 1) {
    if (secp256k1.utils.isValidSecretKey(hexToBytes(candidate))) {
      return candidate;
    }
    candidate = keccak256(hexToBytes(candidate));
  }

  throw new Error("Unable to derive a valid deterministic private key from signature.");
}

export function parsePublicKeyCoordinates(publicKey: Hex): { x: Hex; y: Hex } {
  const raw = publicKey.startsWith("0x04") ? publicKey.slice(4) : publicKey.slice(2);

  if (raw.length !== 128) {
    throw new Error("Public key must be an uncompressed key (65 bytes with 0x04 prefix).");
  }

  return {
    x: `0x${raw.slice(0, 64)}` as Hex,
    y: `0x${raw.slice(64, 128)}` as Hex,
  };
}

export function deriveAddressFromPublicKey(publicKey: Hex): Hex {
  const key = publicKey.startsWith("0x04") ? publicKey : (`0x04${publicKey.slice(2)}` as Hex);
  return publicKeyToAddress(key) as Hex;
}

export function validateViewerKey(publicKey: Hex, expectedViewerAddress?: Hex): string | undefined {
  if (!expectedViewerAddress) {
    return undefined;
  }

  if (isAddressEqual(expectedViewerAddress, zeroAddress)) {
    return undefined;
  }

  const derivedViewerAddress = deriveAddressFromPublicKey(publicKey);
  if (!isAddressEqual(derivedViewerAddress, expectedViewerAddress)) {
    return "Public key does not match the registered viewer address.";
  }

  return undefined;
}

export function deriveViewerKeypair(signature: Hex): ViewerKeypair {
  const privateKey = privateKeyFromSignature(signature);
  const publicKey = toHex(secp256k1.getPublicKey(hexToBytes(privateKey), false));
  const { x, y } = parsePublicKeyCoordinates(publicKey);

  return { privateKey, publicKey, x, y };
}
