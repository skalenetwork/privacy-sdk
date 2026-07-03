import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { cbc } from "@noble/ciphers/aes";
import { bytesToHex, decodeAbiParameters, hexToBytes, type Hex } from "viem";

import type { TransferData } from "../types.js";

function bytesToBigInt(bytes: Uint8Array): bigint {
  if (bytes.length === 0) {
    return 0n;
  }
  const hexValue = bytesToHex(bytes);
  return BigInt(hexValue === "0x" ? "0x0" : hexValue);
}

export function decryptEciesPayload(encryptedHex: Hex, privateKey: Hex): Uint8Array {
  const payload = hexToBytes(encryptedHex);

  if (payload.length < 65) {
    throw new Error("Encrypted payload is too short.");
  }

  const iv = payload.slice(0, 16);
  const ephemeralCompressedPublicKey = payload.slice(16, 49);
  const ciphertext = payload.slice(49);

  if (ephemeralCompressedPublicKey.length !== 33) {
    throw new Error("Invalid ephemeral public key length in encrypted payload.");
  }

  if (ciphertext.length === 0 || ciphertext.length % 16 !== 0) {
    throw new Error("Invalid AES-CBC ciphertext length.");
  }

  const sharedSecret = secp256k1.getSharedSecret(
    hexToBytes(privateKey),
    ephemeralCompressedPublicKey,
    true,
  );
  const encryptionKey = sha256(sharedSecret.slice(1));
  const keyMaterial = Uint8Array.from(encryptionKey);

  return cbc(keyMaterial, iv).decrypt(ciphertext);
}

function tryDecodeTransferData(encoded: Hex): TransferData | undefined {
  try {
    const [from, to, value, timestamp, transferId] = decodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      encoded,
    );

    return { from, to, value, timestamp, transferId };
  } catch {
    return undefined;
  }
}

export async function decryptBalance(encryptedHex: Hex, privateKey: Hex): Promise<bigint> {
  const plaintext = decryptEciesPayload(encryptedHex, privateKey);

  if (plaintext.length <= 32) {
    return bytesToBigInt(plaintext);
  }

  return bytesToBigInt(plaintext.slice(-32));
}

export async function decryptTransferData(
  encryptedHex: Hex,
  privateKey: Hex,
): Promise<TransferData> {
  const plaintext = decryptEciesPayload(encryptedHex, privateKey);

  const direct = tryDecodeTransferData(bytesToHex(plaintext));
  if (direct) {
    return direct;
  }

  const structSizeBytes = 32 * 5;
  if (plaintext.length >= structSizeBytes) {
    const trailing = plaintext.slice(-structSizeBytes);
    const trailingDecoded = tryDecodeTransferData(bytesToHex(trailing));
    if (trailingDecoded) {
      return trailingDecoded;
    }
  }

  throw new Error("Unable to decode decrypted transfer payload as TransferData struct.");
}
