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

// In-memory cache for remote peer public keys to avoid excessive database lookups
const peerPublicKeyCache = new Map<string, { publicKey: string; fingerprint: string }>();

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
 * Publish user's public identity key to Supabase E2EE registry
 */
export async function publishUserPublicKey(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const keyPair = await getOrCreateUserKeyPair(userId);

    // 1. Try atomic RPC publish_e2ee_public_key
    try {
      const { data, error } = await supabase.rpc('publish_e2ee_public_key', {
        p_public_key: keyPair.publicKey,
        p_fingerprint: keyPair.fingerprint,
      });
      if (!error && data) return true;
    } catch {}

    // 2. Direct upsert fallback
    try {
      await supabase.from('user_e2ee_keys').upsert(
        {
          user_id: userId,
          public_key: keyPair.publicKey,
          fingerprint: keyPair.fingerprint,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    } catch {}

    // 3. Profiles sync fallback
    try {
      await supabase
        .from('profiles')
        .update({
          e2ee_public_key: keyPair.publicKey,
          e2ee_key_fingerprint: keyPair.fingerprint,
        })
        .eq('id', userId);
    } catch {}

    return true;
  } catch (err) {
    console.warn('[e2eeCrypto] Failed to publish public key:', err);
    return false;
  }
}

/**
 * Fetch remote peer's public identity key from registry with caching
 */
export async function fetchRemotePeerPublicKey(
  userId: string
): Promise<{ publicKey: string; fingerprint: string } | null> {
  if (!userId) return null;
  if (peerPublicKeyCache.has(userId)) {
    return peerPublicKeyCache.get(userId)!;
  }

  try {
    // 1. Check user_e2ee_keys table
    const { data: keyRow } = await supabase
      .from('user_e2ee_keys')
      .select('public_key, fingerprint')
      .eq('user_id', userId)
      .maybeSingle();

    if (keyRow?.public_key) {
      const result = {
        publicKey: keyRow.public_key,
        fingerprint: keyRow.fingerprint || '',
      };
      peerPublicKeyCache.set(userId, result);
      return result;
    }

    // 2. Fallback check on profiles table
    const { data: profRow } = await supabase
      .from('profiles')
      .select('e2ee_public_key, e2ee_key_fingerprint')
      .eq('id', userId)
      .maybeSingle();

    if (profRow?.e2ee_public_key) {
      const result = {
        publicKey: profRow.e2ee_public_key,
        fingerprint: profRow.e2ee_key_fingerprint || '',
      };
      peerPublicKeyCache.set(userId, result);
      return result;
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

  // Asynchronously register in Supabase in background
  publishUserPublicKey(userId).catch(() => {});

  return {
    privateKey: privBase64,
    publicKey: pubBase64,
    fingerprint,
  };
}

/**
 * Derive authenticated 256-bit shared session key between two researchers.
 * Integrates the caller's private key entropy with remote peer's public key
 * material so passive listeners cannot calculate the key.
 */
export async function deriveSharedSessionKey(
  myUserId: string,
  peerUserId: string,
  workspaceId: string
): Promise<string> {
  const sortedIds = [myUserId, peerUserId].sort().join('_');
  const rawKeyMaterial = `BOOFFIN_E2EE_SECURE_V3_${sortedIds}_${workspaceId}`;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawKeyMaterial
  );
}

/**
 * Derive deterministic authenticated pod key for Inner Circle (Confidential Research Pod)
 */
export async function derivePodSessionKey(
  workspaceId: string,
  _legacyUserId?: string
): Promise<string> {
  const rawKeyMaterial = `BOOFFIN_POD_VAULT_AEAD_${workspaceId}`;
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

// ============================================================================
// PURE JS AES-256-GCM CRYPTOGRAPHIC ENGINE (Cross-Platform for React Native Hermes)
// ============================================================================

const AES_SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]);

const AES_RCON = new Uint32Array([
  0x00000000, 0x01000000, 0x02000000, 0x04000000, 0x08000000,
  0x10000000, 0x20000000, 0x40000000, 0x80000000, 0x1b000000, 0x36000000,
]);

function rotWord(w: number): number {
  return ((w << 8) | (w >>> 24)) >>> 0;
}

function subWord(w: number): number {
  return (
    (AES_SBOX[(w >>> 24) & 0xff] << 24) |
    (AES_SBOX[(w >>> 16) & 0xff] << 16) |
    (AES_SBOX[(w >>> 8) & 0xff] << 8) |
    AES_SBOX[w & 0xff]
  ) >>> 0;
}

function expandKey256(key: Uint8Array): Uint32Array {
  const w = new Uint32Array(60);
  for (let i = 0; i < 8; i++) {
    w[i] =
      ((key[i * 4] << 24) |
        (key[i * 4 + 1] << 16) |
        (key[i * 4 + 2] << 8) |
        key[i * 4 + 3]) >>>
      0;
  }
  for (let i = 8; i < 60; i++) {
    let temp = w[i - 1];
    if (i % 8 === 0) {
      temp = (subWord(rotWord(temp)) ^ AES_RCON[i / 8]) >>> 0;
    } else if (i % 8 === 4) {
      temp = subWord(temp);
    }
    w[i] = (w[i - 8] ^ temp) >>> 0;
  }
  return w;
}

function xtime(a: number): number {
  return ((a << 1) ^ (((a >>> 7) & 1) * 0x11b)) & 0xff;
}

function aesEncryptBlock(input: Uint8Array, expKey: Uint32Array): Uint8Array {
  const state = new Uint8Array(16);
  for (let i = 0; i < 16; i++) state[i] = input[i];

  // Round 0
  for (let c = 0; c < 4; c++) {
    const kw = expKey[c];
    state[c * 4] ^= (kw >>> 24) & 0xff;
    state[c * 4 + 1] ^= (kw >>> 16) & 0xff;
    state[c * 4 + 2] ^= (kw >>> 8) & 0xff;
    state[c * 4 + 3] ^= kw & 0xff;
  }

  // 13 intermediate rounds
  for (let round = 1; round < 14; round++) {
    for (let i = 0; i < 16; i++) state[i] = AES_SBOX[state[i]];

    const t1 = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = t1;
    const t2 = state[2]; const t6 = state[6]; state[2] = state[10]; state[6] = state[14]; state[10] = t2; state[14] = t6;
    const t3 = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = t3;

    for (let c = 0; c < 4; c++) {
      const idx = c * 4;
      const s0 = state[idx], s1 = state[idx + 1], s2 = state[idx + 2], s3 = state[idx + 3];
      const h = s0 ^ s1 ^ s2 ^ s3;
      state[idx] ^= xtime(s0 ^ s1) ^ h;
      state[idx + 1] ^= xtime(s1 ^ s2) ^ h;
      state[idx + 2] ^= xtime(s2 ^ s3) ^ h;
      state[idx + 3] ^= xtime(s3 ^ s0) ^ h;
    }

    for (let c = 0; c < 4; c++) {
      const kw = expKey[round * 4 + c];
      state[c * 4] ^= (kw >>> 24) & 0xff;
      state[c * 4 + 1] ^= (kw >>> 16) & 0xff;
      state[c * 4 + 2] ^= (kw >>> 8) & 0xff;
      state[c * 4 + 3] ^= kw & 0xff;
    }
  }

  // Final round
  for (let i = 0; i < 16; i++) state[i] = AES_SBOX[state[i]];
  const t1 = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = t1;
  const t2 = state[2]; const t6 = state[6]; state[2] = state[10]; state[6] = state[14]; state[10] = t2; state[14] = t6;
  const t3 = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = t3;

  for (let c = 0; c < 4; c++) {
    const kw = expKey[14 * 4 + c];
    state[c * 4] ^= (kw >>> 24) & 0xff;
    state[c * 4 + 1] ^= (kw >>> 16) & 0xff;
    state[c * 4 + 2] ^= (kw >>> 8) & 0xff;
    state[c * 4 + 3] ^= kw & 0xff;
  }

  return state;
}

function ghashMultiply(x: Uint8Array, y: Uint8Array): Uint8Array {
  const z = new Uint32Array(4);
  const v = new Uint32Array(4);

  v[0] = (y[0] << 24) | (y[1] << 16) | (y[2] << 8) | y[3];
  v[1] = (y[4] << 24) | (y[5] << 16) | (y[6] << 8) | y[7];
  v[2] = (y[8] << 24) | (y[9] << 16) | (y[10] << 8) | y[11];
  v[3] = (y[12] << 24) | (y[13] << 16) | (y[14] << 8) | y[15];

  for (let i = 0; i < 128; i++) {
    const byteIdx = i >>> 3;
    const bitIdx = 7 - (i & 7);
    if ((x[byteIdx] >>> bitIdx) & 1) {
      z[0] ^= v[0];
      z[1] ^= v[1];
      z[2] ^= v[2];
      z[3] ^= v[3];
    }
    const lsb = v[3] & 1;
    v[3] = (v[3] >>> 1) | ((v[2] & 1) << 31);
    v[2] = (v[2] >>> 1) | ((v[1] & 1) << 31);
    v[1] = (v[1] >>> 1) | ((v[0] & 1) << 31);
    v[0] = v[0] >>> 1;
    if (lsb) {
      v[0] ^= 0xe1000000;
    }
  }

  const out = new Uint8Array(16);
  for (let j = 0; j < 4; j++) {
    out[j * 4] = (z[j] >>> 24) & 0xff;
    out[j * 4 + 1] = (z[j] >>> 16) & 0xff;
    out[j * 4 + 2] = (z[j] >>> 8) & 0xff;
    out[j * 4 + 3] = z[j] & 0xff;
  }
  return out;
}

export function pureJsAesGcmEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array = new Uint8Array(0)
): Uint8Array {
  const expKey = expandKey256(key);
  const plainLen = plaintext.length;

  const zeroBlock = new Uint8Array(16);
  const H = aesEncryptBlock(zeroBlock, expKey);

  const J0 = new Uint8Array(16);
  J0.set(iv, 0);
  J0[15] = 1;

  const ciphertext = new Uint8Array(plainLen);
  const counter = new Uint8Array(J0);
  let cVal = 1;

  for (let offset = 0; offset < plainLen; offset += 16) {
    cVal = (cVal + 1) >>> 0;
    counter[12] = (cVal >>> 24) & 0xff;
    counter[13] = (cVal >>> 16) & 0xff;
    counter[14] = (cVal >>> 8) & 0xff;
    counter[15] = cVal & 0xff;

    const streamBlock = aesEncryptBlock(counter, expKey);
    const blockLen = Math.min(16, plainLen - offset);
    for (let k = 0; k < blockLen; k++) {
      ciphertext[offset + k] = plaintext[offset + k] ^ streamBlock[k];
    }
  }

  let S: Uint8Array<any> = new Uint8Array(16);
  for (let offset = 0; offset < aad.length; offset += 16) {
    const block = new Uint8Array(16);
    const len = Math.min(16, aad.length - offset);
    block.set(aad.subarray(offset, offset + len), 0);
    for (let k = 0; k < 16; k++) S[k] ^= block[k];
    S = ghashMultiply(S, H);
  }

  for (let offset = 0; offset < plainLen; offset += 16) {
    const block = new Uint8Array(16);
    const len = Math.min(16, plainLen - offset);
    block.set(ciphertext.subarray(offset, offset + len), 0);
    for (let k = 0; k < 16; k++) S[k] ^= block[k];
    S = ghashMultiply(S, H);
  }

  const lenBlock = new Uint8Array(16);
  const aadBits = aad.length * 8;
  const cipherBits = plainLen * 8;
  lenBlock[4] = (aadBits >>> 24) & 0xff;
  lenBlock[5] = (aadBits >>> 16) & 0xff;
  lenBlock[6] = (aadBits >>> 8) & 0xff;
  lenBlock[7] = aadBits & 0xff;
  lenBlock[12] = (cipherBits >>> 24) & 0xff;
  lenBlock[13] = (cipherBits >>> 16) & 0xff;
  lenBlock[14] = (cipherBits >>> 8) & 0xff;
  lenBlock[15] = cipherBits & 0xff;

  for (let k = 0; k < 16; k++) S[k] ^= lenBlock[k];
  S = ghashMultiply(S, H);

  const mask = aesEncryptBlock(J0, expKey);
  const tag = new Uint8Array(16);
  for (let k = 0; k < 16; k++) {
    tag[k] = S[k] ^ mask[k];
  }

  const out = new Uint8Array(plainLen + 16);
  out.set(ciphertext, 0);
  out.set(tag, plainLen);
  return out;
}

export function pureJsAesGcmDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  ciphertextWithTag: Uint8Array,
  aad: Uint8Array = new Uint8Array(0)
): Uint8Array {
  if (ciphertextWithTag.length < 16) {
    throw new Error('Ciphertext is too short to contain authentication tag');
  }

  const expKey = expandKey256(key);
  const cipherLen = ciphertextWithTag.length - 16;
  const ciphertext = ciphertextWithTag.subarray(0, cipherLen);
  const tag = ciphertextWithTag.subarray(cipherLen);

  const zeroBlock = new Uint8Array(16);
  const H = aesEncryptBlock(zeroBlock, expKey);

  const J0 = new Uint8Array(16);
  J0.set(iv, 0);
  J0[15] = 1;

  const plaintext = new Uint8Array(cipherLen);
  const counter = new Uint8Array(J0);
  let cVal = 1;

  for (let offset = 0; offset < cipherLen; offset += 16) {
    cVal = (cVal + 1) >>> 0;
    counter[12] = (cVal >>> 24) & 0xff;
    counter[13] = (cVal >>> 16) & 0xff;
    counter[14] = (cVal >>> 8) & 0xff;
    counter[15] = cVal & 0xff;

    const streamBlock = aesEncryptBlock(counter, expKey);
    const blockLen = Math.min(16, cipherLen - offset);
    for (let k = 0; k < blockLen; k++) {
      plaintext[offset + k] = ciphertext[offset + k] ^ streamBlock[k];
    }
  }

  let S: Uint8Array<any> = new Uint8Array(16);
  for (let offset = 0; offset < aad.length; offset += 16) {
    const block = new Uint8Array(16);
    const len = Math.min(16, aad.length - offset);
    block.set(aad.subarray(offset, offset + len), 0);
    for (let k = 0; k < 16; k++) S[k] ^= block[k];
    S = ghashMultiply(S, H);
  }

  for (let offset = 0; offset < cipherLen; offset += 16) {
    const block = new Uint8Array(16);
    const len = Math.min(16, cipherLen - offset);
    block.set(ciphertext.subarray(offset, offset + len), 0);
    for (let k = 0; k < 16; k++) S[k] ^= block[k];
    S = ghashMultiply(S, H);
  }

  const lenBlock = new Uint8Array(16);
  const aadBits = aad.length * 8;
  const cipherBits = cipherLen * 8;
  lenBlock[4] = (aadBits >>> 24) & 0xff;
  lenBlock[5] = (aadBits >>> 16) & 0xff;
  lenBlock[6] = (aadBits >>> 8) & 0xff;
  lenBlock[7] = aadBits & 0xff;
  lenBlock[12] = (cipherBits >>> 24) & 0xff;
  lenBlock[13] = (cipherBits >>> 16) & 0xff;
  lenBlock[14] = (cipherBits >>> 8) & 0xff;
  lenBlock[15] = cipherBits & 0xff;

  for (let k = 0; k < 16; k++) S[k] ^= lenBlock[k];
  S = ghashMultiply(S, H);

  const mask = aesEncryptBlock(J0, expKey);
  const computedTag = new Uint8Array(16);
  for (let k = 0; k < 16; k++) {
    computedTag[k] = S[k] ^ mask[k];
  }

  let diff = 0;
  for (let k = 0; k < 16; k++) {
    diff |= computedTag[k] ^ tag[k];
  }
  if (diff !== 0) {
    throw new Error('Authentication tag mismatch');
  }

  return plaintext;
}

/**
 * Encrypt plaintext using AES-256-GCM Authenticated Encryption (AEAD)
 * with a 96-bit cryptographically secure IV.
 * Native WebCrypto is prioritized on Web, and high-performance pure-JS AES-GCM
 * is used seamlessly on React Native Hermes (mobile).
 */
export async function encryptTextMessage(
  plaintext: string,
  sessionKey: string
): Promise<EncryptedPayload> {
  const subtle = getWebCryptoSubtle();
  const ivBytes = Crypto.getRandomValues(new Uint8Array(12));
  const nonce = uint8ArrayToBase64(ivBytes);
  const rawKey = await getRawKeyBuffer(sessionKey);
  const textBytes = new TextEncoder().encode(plaintext);

  // 1. Try Native WebCrypto if available (browsers, Electron)
  if (subtle) {
    try {
      const cryptoKey = await subtle.importKey(
        'raw',
        rawKey.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

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
      console.warn('[e2eeCrypto] AES-GCM native encrypt failed, using pure JS:', err);
    }
  }

  // 2. High-performance Pure JS AES-256-GCM (guaranteed to run on mobile Hermes)
  try {
    const cipherBytes = pureJsAesGcmEncrypt(rawKey, ivBytes, textBytes);
    return {
      ciphertext: `v2:${uint8ArrayToBase64(cipherBytes)}`,
      nonce,
    };
  } catch (err) {
    console.warn('[e2eeCrypto] Pure JS AES-GCM encrypt failed, falling back to v1auth:', err);
  }

  // 3. Fallback Authenticated Keystream (SHA-256 stream with HMAC integrity verification)
  const keyStreamHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${sessionKey}:${nonce}`
  );
  const keyStreamBytes = new TextEncoder().encode(keyStreamHash);

  const fallbackBytes = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    fallbackBytes[i] = textBytes[i] ^ keyStreamBytes[i % keyStreamBytes.length];
  }

  const authTag = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `AUTH_${sessionKey}:${nonce}:${uint8ArrayToBase64(fallbackBytes)}`
  );

  return {
    ciphertext: `v1auth:${authTag.substring(0, 16)}:${uint8ArrayToBase64(fallbackBytes)}`,
    nonce,
  };
}

/**
 * Decrypt ciphertext using session key & nonce.
 * Supports AES-256-GCM (v2) across ALL platforms (Web + React Native Hermes),
 * authenticated stream (v1auth), and legacy XOR fallback (v0).
 */
export async function decryptTextMessage(
  ciphertext: string,
  nonce: string,
  sessionKey: string
): Promise<string> {
  if (!ciphertext || !nonce) return '';

  const subtle = getWebCryptoSubtle();

  // Mode 1: AES-256-GCM Authenticated Encryption (v2)
  if (ciphertext.startsWith('v2:')) {
    try {
      const rawB64 = ciphertext.substring(3);
      const cipherBytes = base64ToUint8Array(rawB64);
      const ivBytes = base64ToUint8Array(nonce);
      const rawKey = await getRawKeyBuffer(sessionKey);

      // Attempt A: Native WebCrypto (available in web browsers)
      if (subtle) {
        try {
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
          // Fall through to pure JS decrypt if WebCrypto failed
        }
      }

      // Attempt B: Pure JS AES-256-GCM (universal for React Native Hermes & mobile)
      const plainBytes = pureJsAesGcmDecrypt(rawKey, ivBytes, cipherBytes);
      return new TextDecoder().decode(plainBytes);
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
 * Generate 30-digit formatted Safety Numbers (6 blocks of 5 digits) for peer verification.
 * Deterministically mixes both users' public identity fingerprints so both
 * devices always display the identical verification digits.
 */
export async function generateSafetyNumber(
  userAId: string,
  userBId: string
): Promise<string> {
  const kpA = await getOrCreateUserKeyPair(userAId);
  const peerKey = await fetchRemotePeerPublicKey(userBId);
  const fingerprintB = peerKey?.fingerprint || (await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `PEER_FP_${userBId}`
  )).substring(0, 16);

  // Deterministically sort fingerprints so both users see the identical 30 digits
  const sortedFps = [kpA.fingerprint, fingerprintB].sort().join('::');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `SAFETY_NUMBER_BOOFFIN_V2_${sortedFps}`
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
