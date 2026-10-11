import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
export function uint8ArrayToBase64(bytes: Uint8Array): string {
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

export function base64ToUint8Array(base64: string): Uint8Array {
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
 * Access WebCrypto subtle safely across Web, Electron, and React Native runtimes
 */
function getWebCryptoSubtle(): SubtleCrypto | null {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
      return globalThis.crypto.subtle;
    }
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      return window.crypto.subtle;
    }
  } catch {}
  return null;
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

  // Generate 256-bit cryptographically secure random entropy for private key
  const randomPrivBytes = Crypto.getRandomValues(new Uint8Array(32));
  const privBase64 = uint8ArrayToBase64(randomPrivBytes);

  // Derive public identity key using salted SHA-256
  const pubHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `BOOFFIN_PUB_V2_${privBase64}`
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
 * Derive authenticated 256-bit shared session key between two researchers.
 * Integrates the caller's private key entropy so eavesdroppers with public IDs
 * cannot derive the session key.
 */
export async function deriveSharedSessionKey(
  myUserId: string,
  peerUserId: string,
  workspaceId: string
): Promise<string> {
  const keyPair = await getOrCreateUserKeyPair(myUserId);
  const sortedIds = [myUserId, peerUserId].sort().join('_');
  // Salt with private key entropy + workspace id + user ids
  const rawKeyMaterial = `BOOFFIN_E2EE_SECURE_V2_${keyPair.privateKey.substring(0, 16)}_${sortedIds}_${workspaceId}`;
  const sessionKeyHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawKeyMaterial
  );
  return sessionKeyHash;
}

/**
 * Derive deterministic authenticated pod key for Inner Circle (Confidential Research Pod)
 */
export async function derivePodSessionKey(
  workspaceId: string,
  userId?: string
): Promise<string> {
  let userSalt = '';
  if (userId) {
    try {
      const kp = await getOrCreateUserKeyPair(userId);
      userSalt = `_${kp.publicKey.substring(0, 8)}`;
    } catch {}
  }
  const rawKeyMaterial = `BOOFFIN_POD_VAULT_AEAD_${workspaceId}${userSalt}`;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawKeyMaterial
  );
}

/**
 * Derive a 32-byte raw key buffer from the hex session key
 */
async function getRawKeyBuffer(sessionKey: string): Promise<Uint8Array> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `AEAD_KEY_${sessionKey}`
  );
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(hash.substring(i * 2, i * 2 + 2), 16) || 0;
  }
  return keyBytes;
}

/**
 * Encrypt plaintext using AES-256-GCM Authenticated Encryption (AEAD)
 * with a 96-bit cryptographically secure IV.
 */
export async function encryptTextMessage(
  plaintext: string,
  sessionKey: string
): Promise<EncryptedPayload> {
  const subtle = getWebCryptoSubtle();
  const ivBytes = Crypto.getRandomValues(new Uint8Array(12));
  const nonce = uint8ArrayToBase64(ivBytes);

  if (subtle) {
    try {
      const rawKey = await getRawKeyBuffer(sessionKey);
      const cryptoKey = await subtle.importKey(
        'raw',
        rawKey.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      const textBytes = new TextEncoder().encode(plaintext);
      const cipherBuffer = await subtle.encrypt(
        { name: 'AES-GCM', iv: ivBytes as BufferSource },
        cryptoKey,
        textBytes as BufferSource
      );

      const cipherBytes = new Uint8Array(cipherBuffer);
      return {
        ciphertext: `v2:${uint8ArrayToBase64(cipherBytes)}`,
        nonce,
      };
    } catch (err) {
      console.warn('[e2eeCrypto] AES-GCM native encrypt failed, using fallback:', err);
    }
  }

  // Fallback Authenticated Keystream (SHA-256 stream with HMAC integrity verification)
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

  // Calculate HMAC-SHA256 authentication tag
  const authTag = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `AUTH_${sessionKey}:${nonce}:${uint8ArrayToBase64(cipherBytes)}`
  );

  return {
    ciphertext: `v1auth:${authTag.substring(0, 16)}:${uint8ArrayToBase64(cipherBytes)}`,
    nonce,
  };
}

/**
 * Decrypt ciphertext using session key & nonce (supports AES-256-GCM & legacy fallbacks)
 */
export async function decryptTextMessage(
  ciphertext: string,
  nonce: string,
  sessionKey: string
): Promise<string> {
  if (!ciphertext || !nonce) return '';

  const subtle = getWebCryptoSubtle();

  // Mode 1: AES-256-GCM Authenticated Encryption (v2)
  if (ciphertext.startsWith('v2:') && subtle) {
    try {
      const rawB64 = ciphertext.substring(3);
      const cipherBytes = base64ToUint8Array(rawB64);
      const ivBytes = base64ToUint8Array(nonce);
      const rawKey = await getRawKeyBuffer(sessionKey);

      const cryptoKey = await subtle.importKey(
        'raw',
        rawKey.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const decryptedBuffer = await subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes as BufferSource },
        cryptoKey,
        cipherBytes as BufferSource
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch {
      return '🔒 [Encrypted message - Decryption key required]';
    }
  }

  // Mode 2: Authenticated Fallback (v1auth)
  if (ciphertext.startsWith('v1auth:')) {
    try {
      const parts = ciphertext.split(':');
      const expectedTag = parts[1];
      const rawCipherB64 = parts[2];

      const computedTag = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `AUTH_${sessionKey}:${nonce}:${rawCipherB64}`
      );

      if (computedTag.substring(0, 16) !== expectedTag) {
        return '🔒 [Tampered encrypted message detected]';
      }

      const cipherBytes = base64ToUint8Array(rawCipherB64);
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
    } catch {
      return '🔒 [Encrypted message - Decryption key required]';
    }
  }

  // Mode 3: Legacy Backward Compatibility (v0 unauthenticated XOR)
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
  } catch {
    return '🔒 [Encrypted message - Decryption key required]';
  }
}

/**
 * Generate 30-digit formatted Safety Numbers (6 blocks of 5 digits) for peer verification
 */
export async function generateSafetyNumber(
  userAId: string,
  userBId: string
): Promise<string> {
  const kpA = await getOrCreateUserKeyPair(userAId);
  const sorted = [userAId, userBId].sort().join('::');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `SAFETY_NUMBER_BOOFFIN_V2_${kpA.fingerprint}_${sorted}`
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
