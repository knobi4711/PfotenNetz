# Passkey deployment

PfotenNetz uses `pfotennetz.app` as its permanent WebAuthn relying-party ID.
Changing this ID invalidates existing passkeys.

## Supabase Auth

Enable experimental passkeys with:

```toml
[auth.passkey]
enabled = true

[auth.webauthn]
rp_display_name = "PfotenNetz"
rp_id = "pfotennetz.app"
rp_origins = [
  "https://pfotennetz.app",
  "android:apk-key-hash:<base64url SHA-256 signing certificate>"
]
```

Every Android signing certificate used with passkeys needs its own app origin.
Do not remove an origin while passkeys registered with that build are in use.

## Web deployment

Configure these server-side environment variables in the deployment of
`apps/web`:

- `APPLE_TEAM_ID`
- `ANDROID_SHA256_CERT_FINGERPRINTS` (colon-separated SHA-256 values,
  comma-separated when more than one certificate is active)

The web app serves the Apple association and Android Digital Asset Links files
from `/.well-known/` and provides Windows Hello registration and sign-in.

## Native builds

Passkeys require a development or release build. Expo Go does not contain the
`react-native-passkeys` native module. After changing associated domains or
signing certificates, rebuild and reinstall the app.
