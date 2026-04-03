# AURA Protected Contour Rollout

## Canonical version policy

- `minecraftVersion` must be `1.21.4` everywhere.
- `modloader` must be `fabric` everywhere.
- Any legacy/demo files are non-canonical and must not be used by production routing.

## Required environment variables

- `APP_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `TOKEN_ISSUER`
- `DOWNLOAD_LINK_SECRET`
- `MANIFEST_PRIVATE_KEYS_JSON` and `MANIFEST_CURRENT_KID`
- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`
- `YOOKASSA_WEBHOOK_SECRET`
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_WEB_API_KEY`

## Canonical API contract

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/account/me`
- `GET /api/account/download/launcher-url`
- `POST /api/payments/create`
- `POST /api/payments/check`
- `POST /api/payments/webhook`
- `POST /api/launcher/login`
- `POST /api/launcher/manifest`
- `POST /api/launcher/heartbeat`
- `POST /api/launcher/verify-session`
- `POST /api/client/mods/verify`
- `GET /api/download/artifact?token=...`

## Migration

Run:

```bash
npm run migrate:entitlements
```

The script backfills:

- `entitlements/{uid}`
- `devices/{uid}_{deviceId}`
- normalized `users/{uid}.status`

Ambiguous users are marked with `migrationStatus=manual_review`.

## Security controls enabled

- one-time download links with TTL and optional IP scope
- refresh-token rotation (single-use refresh tokens)
- global revocation support (`revocations/global`)
- payment webhook idempotency hash (`providerPayloadHash`)
- entitlement-gated launcher downloads and launcher sessions
