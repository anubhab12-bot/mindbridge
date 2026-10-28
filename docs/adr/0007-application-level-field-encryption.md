# ADR-0007: Application-level field encryption

- Status: Accepted
- Date: 2026-10-27

## Context

Journals, AI conversations, clinical notes, secure messages and intake answers are the most
sensitive data in the system. Disk encryption does not protect against a leaked database dump or
backup, or a misconfigured read replica.

## Decision

Encrypt those fields (and MFA secrets) in the API with AES-256-GCM, using a random 96-bit IV per
value and the key from `FIELD_ENCRYPTION_KEY`. Values are stored as `enc:v1:<base64(iv|tag|data)>`.

## Consequences

- A database dump on its own does not reveal that content.
- Encrypted fields cannot be searched or indexed in MongoDB. Features are designed around that, for example journal previews are produced after decryption.
- Losing the key means losing the data, so the key must be backed up separately. Key rotation is not implemented yet; the `v1` prefix leaves room for it.
