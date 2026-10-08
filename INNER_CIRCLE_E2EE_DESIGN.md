# Inner Circle End-to-End Encryption (E2EE) Architectural Specification

## 1. Overview & Threat Model
The **Inner Circle** workspace subsystem within BooffIn provides confidential research collaboration pods capped at a hard limit of 25 verified researchers. To guarantee that proprietary research findings, unpublished preprints, sensitive grant drafts, and intellectual property remain confidential even from platform database administrators, BooffIn implements client-side End-to-End Encryption (E2EE).

### Threat Model
- **Untrusted / Compromised Database Server**: An attacker with full read access to `workspace_messages` or database dumps cannot decrypt message contents or read sensitive paper annotations.
- **Man-in-the-Middle (MitM)**: All key exchanges and ciphertext payloads are authenticated cryptographically.
- **Participant Revocation**: When a pod member leaves or is removed, the pod group key is rotated immediately (Forward Secrecy).

---

## 2. Cryptographic Primitives & Key Management
Inner Circle E2EE uses modern, battle-tested standard cryptographic primitives:

1. **Identity Keypair (X25519 / Ed25519)**:
   - Generated client-side upon user enrollment.
   - Public Key is stored in `public.profiles.e2ee_public_key` and `public.workspaces.e2ee_public_keys`.
   - Private Key is stored strictly on device in hardware-backed secure storage (`expo-secure-store` / `window.crypto.subtle` with WebAuthn/Secure Enclave).

2. **Pod Symmetric Session Key (AES-256-GCM / ChaCha20-Poly1305)**:
   - Each Inner Circle pod possesses a deterministic, rotating Pod Symmetric Key (`K_pod`).
   - When a pod is initialized, the creator generates a cryptographically random 256-bit key (`K_pod_v1`).
   - `K_pod_v1` is encrypted individually for each invited member using X25519 Diffie-Hellman + HKDF key agreement (`Enc_member_pub(K_pod_v1)`).

3. **Message Encryption Format**:
   - For each message payload $M$:
     - Generate a fresh 96-bit initialization vector/nonce $IV$.
     - Encrypt message and optional DOI metadata: $C = \text{AES-256-GCM}_{K\_pod}(IV, M, AAD)$ where $AAD = \text{workspace\_id} \mathbin{\Vert} \text{sender\_id} \mathbin{\Vert} \text{timestamp}$.
     - Store $C$ in `workspace_messages.e2ee_ciphertext` and $IV$ in `workspace_messages.e2ee_nonce`.
     - `workspace_messages.content` is set to `[Encrypted Research Note]` or empty string.

---

## 3. Database Schema Interoperability
In `public.workspace_messages`:
- `message_type`: `'e2ee_cipher'` or `'paper_doi'`
- `e2ee_ciphertext`: `TEXT` (Base64 encoded ciphertext + authentication tag)
- `e2ee_nonce`: `TEXT` (Base64 encoded IV)
- `doi_metadata`: When sharing sensitive papers, DOI metadata can either be shared in plaintext for link previews or embedded within the encrypted payload for maximum confidentiality.

---

## 4. Key Rotation & Member Eviction
- When a member is removed via transparent moderation or voluntarily leaves:
  1. The pod owner/admin client generates a new key version: `K_pod_v2`.
  2. The client fetches the public keys of the remaining $\le 24$ active members.
  3. Re-encrypts `K_pod_v2` for each active member and updates `workspaces.e2ee_public_keys`.
  4. Messages created after rotation are encrypted with `K_pod_v2`. Old messages remain protected by `K_pod_v1` (Post-Compromise Security & Forward Secrecy).

---

## 5. Client Decryption Flow
1. Client joins/opens `/workspace/[id]`.
2. Fetches encrypted `K_pod` from workspace metadata.
3. Decrypts `K_pod` using its local private key in SecureStore.
4. For each message in `workspace_messages`, decrypts `e2ee_ciphertext` with `e2ee_nonce` and displays decrypted text seamlessly in the UI.
