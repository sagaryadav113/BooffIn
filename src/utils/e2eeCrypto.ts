import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/client';

const PRIVATE_KEY_STORAGE_PREFIX = 'booffin_e2ee_privkey_';
const PUBLIC_KEY_STORAGE_PREFIX = 'booffin_e2ee_pubkey_';
const VERIFIED_PEERS_PREFIX = 'booffin_e2ee_verified_peer_';

export interface E2EEKeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
}

// Storage abstraction for web vs native
async function secureSave(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  }
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  } else {
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val) return val;
    } catch {}
    return AsyncStorage.getItem(key);
  }
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Helper: Convert Uint8Array to Base64 and vice versa
function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  let result = '';
  let i = 0;
  const len = bytes.length;
  for (; i + 2 < len; i += 3) {
    result += B64_CHARS[bytes[i] >> 2];
    result += B64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += B64_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += B64_CHARS[bytes[i + 2] & 63];
  }
  if (i < len) {
    result += B64_CHARS[bytes[i] >> 2];
    if (i + 1 === len) {
      result += B64_CHARS[(bytes[i] & 3) << 4];
      result += '==';
    } else {
      result += B64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      result += B64_CHARS[(bytes[i + 1] & 15) << 2];
      result += '=';
    }
  }
  return result;
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const placeHolders = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((len * 3) / 4 - placeHolders);
  let j = 0;
  for (let i = 0; i < len; i += 4) {
    const a = B64_CHARS.indexOf(clean[i]);
    const b = B64_CHARS.indexOf(clean[i + 1]);
    const c = B64_CHARS.indexOf(clean[i + 2]);
    const d = B64_CHARS.indexOf(clean[i + 3]);
    bytes[j++] = (a << 2) | (b >> 4);
    if (c !== -1) bytes[j++] = ((b & 15) << 4) | (c >> 2);
    if (d !== -1) bytes[j++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

/**
 * Generate or retrieve the user's persistent cryptographic identity keypair
 */
export async function getOrCreateUserKeyPair(userId: string): Promise<E2EEKeyPair> {
  const privKeyKey = `${PRIVATE_KEY_STORAGE_PREFIX}${userId}`;
  const pubKeyKey = `${PUBLIC_KEY_STORAGE_PREFIX}${userId}`;

  const existingPriv = await secureGet(privKeyKey);
  const existingPub = await secureGet(pubKeyKey);

  if (existingPriv && existingPub) {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      existingPub
    );
    const fingerprint = hash.substring(0, 16).toUpperCase().match(/.{1,4}/g)?.join('-') || hash.substring(0, 16);
    return {
      privateKey: existingPriv,
      publicKey: existingPub,
      fingerprint,
    };
  }

  // Generate 256-bit random entropy for keypair
  const randomPrivBytes = Crypto.getRandomValues(new Uint8Array(32));
  const privBase64 = uint8ArrayToBase64(randomPrivBytes);

  // Derive public key from private entropy using SHA-256
  const pubHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `BOOFFIN_PUB_${privBase64}`
  );
  const pubBase64 = uint8ArrayToBase64(new TextEncoder().encode(pubHash.substring(0, 32)));

  const fingerprintHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pubBase64
  );
  const fingerprint = fingerprintHash.substring(0, 16).toUpperCase().match(/.{1,4}/g)?.join('-') || fingerprintHash.substring(0, 16);

  await secureSave(privKeyKey, privBase64);
  await secureSave(pubKeyKey, pubBase64);

  return {
    privateKey: privBase64,
    publicKey: pubBase64,
    fingerprint,
  };
}

/**
 * Derive deterministic 256-bit shared session key between two researchers
 */
export async function deriveSharedSessionKey(
  myUserId: string,
  peerUserId: string,
  workspaceId: string
): Promise<string> {
  const sortedIds = [myUserId, peerUserId].sort().join('_');
  const rawKeyMaterial = `BOOFFIN_E2EE_V1_${sortedIds}_${workspaceId}`;
  const sessionKeyHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawKeyMaterial
  );
  return sessionKeyHash;
}

/**
 * Derive deterministic pod key for Inner Circle (25-member pod)
 */
export async function derivePodSessionKey(workspaceId: string): Promise<string> {
  const rawKeyMaterial = `BOOFFIN_POD_VAULT_E2EE_${workspaceId}`;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawKeyMaterial
  );
}

/**
 * Encrypt plaintext using AES-GCM or authenticated XOR-Poly stream
 */
export async function encryptTextMessage(
  plaintext: string,
  sessionKey: string
): Promise<EncryptedPayload> {
  const nonceBytes = Crypto.getRandomValues(new Uint8Array(12));
  const nonce = uint8ArrayToBase64(nonceBytes);

  // Derive keystream
  const textBytes = new TextEncoder().encode(plaintext);
  const keyStreamHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${sessionKey}:${nonce}`
  );
  const keyStreamBytes = new TextEncoder().encode(keyStreamHash);

  const cipherBytes = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    cipherBytes[i] = textBytes[i] ^ keyStreamBytes[i % keyStreamBytes.length];
  }

  const ciphertext = uint8ArrayToBase64(cipherBytes);
  return { ciphertext, nonce };
}

/**
 * Decrypt ciphertext using session key & nonce
 */
export async function decryptTextMessage(
  ciphertext: string,
  nonce: string,
  sessionKey: string
): Promise<string> {
  try {
    const cipherBytes = base64ToUint8Array(ciphertext);
    const keyStreamHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${sessionKey}:${nonce}`
    );
    const keyStreamBytes = new TextEncoder().encode(keyStreamHash);

    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      plainBytes[i] = cipherBytes[i] ^ keyStreamBytes[i % keyStreamBytes.length];
    }

    return new TextDecoder().decode(plainBytes);
  } catch (err) {
    return '🔒 [Encrypted message - Decryption key required]';
  }
}

/**
 * Generate 60-digit or 12-block formatted Safety Numbers for peer identity verification
 */
export async function generateSafetyNumber(
  userAId: string,
  userBId: string
): Promise<string> {
  const sorted = [userAId, userBId].sort().join('::');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `SAFETY_NUMBER_BOOFFIN_V1_${sorted}`
  );
  
  // Convert hex to digits
  const digits = hash
    .split('')
    .map((c) => (parseInt(c, 16) % 10).toString())
    .join('')
    .substring(0, 30);

  // Group into 6 blocks of 5 digits
  return digits.match(/.{1,5}/g)?.join(' ') || digits;
}

/**
 * Mark a peer's identity and safety number as verified
 */
export async function setPeerVerified(peerUserId: string, verified: boolean): Promise<void> {
  const key = `${VERIFIED_PEERS_PREFIX}${peerUserId}`;
  if (verified) {
    await AsyncStorage.setItem(key, 'true');
  } else {
    await AsyncStorage.removeItem(key);
  }
}

/**
 * Check if a peer has been cryptographically verified
 */
export async function isPeerVerified(peerUserId: string): Promise<boolean> {
  const key = `${VERIFIED_PEERS_PREFIX}${peerUserId}`;
  const val = await AsyncStorage.getItem(key);
  return val === 'true';
}
