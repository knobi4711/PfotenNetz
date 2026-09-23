# Push-Worker

Der Worker `packages/supabase/send-push-notifications.mjs` arbeitet die Tabelle
`notifications` ab (`push_sent = false`, Älteste zuerst, max. 100 pro Lauf).

## Token-Arten

| Token                                       | Versand                                          | Voraussetzung                                                                                                |
| ------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `ExponentPushToken[…]` / `ExpoPushToken[…]` | Expo Push API (`exp.host`)                       | EAS-`projectId` in `app.json` (`expo.extra.eas.projectId`), dann liefert die App automatisch Expo-Tokens     |
| Nativer FCM/APNs-Token                      | **kein Versand** (braucht FCM-/APNs-Credentials) | Zeile wird als `data.push_skipped = "no-expo-token"` markiert, damit sie nicht in einer Retry-Schleife hängt |

Ohne `projectId` registriert die App native Tokens (Fallback) – der Worker läuft,
versendet aber nichts, bis Expo-Tokens vorhanden sind.

## Lauf

```powershell
cd packages/supabase
node send-push-notifications.mjs        # live
$env:DRY_RUN = '1'; node send-push-notifications.mjs  # nur lesen + loggen
```

Benötigte Env (`packages/supabase/.env`): `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, optional `EXPO_ACCESS_TOKEN` (höhere
Expo-Quotas).

## Verhalten

- Expo-Tickets mit `DeviceNotRegistered` → Gerät wird deaktiviert
  (`devices.is_active = false`).
- Abgelehnte Tickets (z. B. `MessageTooBig`) → `push_sent = true` mit
  `data.push_error` (Retry würde nie helfen).
- Netzwerkfehler beim Expo-Call → Zeile bleibt offen, Retry beim nächsten Lauf.
- Empfohlenes Intervall: alle 1–5 Minuten (Cron / GitHub Actions, siehe
  `.github/workflows/send-push.yml`).

## Tests

```powershell
cd pfotennetz
pnpm --filter @pfotennetz/supabase test send-push.test.mjs
```
