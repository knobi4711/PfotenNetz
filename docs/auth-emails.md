# Auth-E-Mails über Brevo (SMTP)

Ziel: Bestätigungs- und Passwort-Reset-Mails von PfotenNetz gehen über einen
eigenen SMTP-Provider raus, mit deutscher Anrede und ohne das harte Limit des
Supabase-Standardmailers (2 Mails/Stunde).

**Aktueller Stand** (Stand 2026-11-02)

- Supabase-Projekt: `njkyujhbcolvtcnlahsk`
- SMTP: Brevo (`smtp-relay.brevo.com:587`), Absender `noreply@pfotennetz.app`,
  `rate_limit_email_sent = 60/h`, `smtp_max_frequency = 10 s`
- `mailer_autoconfirm = false` – Bestätigungs- und Reset-Mails gehen raus,
  neue Registrierungen müssen die E-Mail bestätigen
- Betreffzeilen/Templates: deutsch (über `pnpm auth:mail --apply` gesetzt)
- Empfang: Cloudflare Email Routing, MX `route1-3.mx.cloudflare.net`,
  `hallo@` und `dmarc@pfotennetz.app` werden an das private Postfach geleitet
- SPF: ein Record, `v=spf1 include:spf.brevo.com include:_spf.mx.cloudflare.net ~all`
- DMARC: `p=none`, Reports an Brevo und `dmarc@pfotennetz.app`

---

## 1. Brevo-Konto und Absenderdomain

1. Auf [brevo.com](https://www.brevo.com) registrieren (Free: 300 Mails/Tag).
2. **Settings → Senders, Domains, IPs → Domains → Add a domain** →
   `pfotennetz.app` eintragen.
3. **„Authenticate the domain yourself“** wählen (nicht die automatische
   Variante – Cloudflare-Zugangsdaten würde ich keinem Drittanbieter geben).
4. Brevo zeigt jetzt vier Records. Werte sind kontospezifisch, also immer aus
   dem Brevo-Dialog kopieren – nicht aus dieser Doku.

## 2. DNS-Records in Cloudflare

Cloudflare → `pfotennetz.app` → **DNS → Records**. Die Namen aus Brevo sind
relativ zur Domain (ohne `pfotennetz.app`).

| Typ   | Name (Cloudflare)   | Wert                                                | Hinweis                                     |
| ----- | ------------------- | --------------------------------------------------- | ------------------------------------------- |
| TXT   | `@`                 | `brevo-code:…`                                      | Domain-Eigentumsnachweis, Wert aus Brevo    |
| CNAME | `brevo1._domainkey` | `…dkim.brevo.com`                                   | **Proxy aus** (graue Wolke), Wert aus Brevo |
| CNAME | `brevo2._domainkey` | `…dkim.brevo.com`                                   | **Proxy aus** (graue Wolke), Wert aus Brevo |
| TXT   | `_dmarc`            | `v=DMARC1; p=none; rua=mailto:dmarc@pfotennetz.app` | Start mit `p=none`, später `quarantine`     |
| TXT   | `@`                 | `v=spf1 include:spf.brevo.com ~all`                 | nur **ein** SPF-Record pro Domain           |

### Zuordnung Brevo-Dialog → Cloudflare-Felder

Brevo zeigt nach **„Authenticate domain“** (Variante „I'll add the records
myself“) eine Liste mit Copy-Buttons. Zuordnung:

| Brevo-Bezeichnung          | Cloudflare Type | Cloudflare Name     | Cloudflare Content                                      |
| -------------------------- | --------------- | ------------------- | ------------------------------------------------------- |
| Brevo code                 | `TXT`           | `@`                 | Wert aus Brevo (`brevo-code:…`)                         |
| DKIM 1 record              | `CNAME`         | `brevo1._domainkey` | Wert aus Brevo                                          |
| DKIM 2 record              | `CNAME`         | `brevo2._domainkey` | Wert aus Brevo                                          |
| DMARC record               | `TXT`           | `_dmarc`            | Wert aus Brevo                                          |
| Branded subdomain (`mail`) | `CNAME`         | `mail`              | Wert aus Brevo – **optional**, nur Bilder/Links-Hosting |

### Branded Subdomain (`mail`) – die drei roten Records

Brevo zeigt im aktuellen Setup zusätzlich drei Branding-Records. Sie sind für
reine Auth-Mails nicht nötig, aber Brevos Dialog zählt sie mit und meldet sonst
„Your records don't match yet“:

| Brevo-Bezeichnung        | Cloudflare Type | Cloudflare Name | Zweck                                    |
| ------------------------ | --------------- | --------------- | ---------------------------------------- |
| Branded record           | `CNAME`         | `mail`          | Return-Path / SPF-Alignment für `mail.…` |
| Redirection Record       | `CNAME`         | `r.mail`        | Klick-Tracking-Links über eigene Domain  |
| Image Redirection Record | `CNAME`         | `img.mail`      | Bild-Links in Mails über eigene Domain   |

Alle drei **Proxy aus** (graue Wolke), Werte aus Brevo. Die Namen sind relativ
zum Branded Subdomain-Präfix – heißt es in Brevo `mail`, landen die Records auf
`mail.pfotennetz.app`, `r.mail.pfotennetz.app` und `img.mail.pfotennetz.app`.

**Alternative:** Wenn du kein Branding willst, in Brevo die Domain löschen und
**ohne** Branded Subdomain neu anlegen – dann bleiben nur die vier Auth-Records.
Achtung: Dabei kann Brevo einen neuen Brevo-Code bzw. neue DKIM-Ziele
generieren, die DNS-Werte müssen dann angepasst werden.

Wichtig: Pro Domain darf es **genau einen** SPF-Record (`v=spf1 …`) und **genau
einen** DMARC-Record (`_dmarc`, `v=DMARC1 …`) geben. Mehrere TXT-Records mit
`v=spf1` gelten als ungültig.

**Cloudflare-Fallen** (häufigste Ursache für „DKIM nicht gefunden“):

- Bei den DKIM-CNAMEs muss der Proxy (orange Wolke) **aus** sein.
- **CNAME Flattening** deaktivieren, sonst wandelt Cloudflare den CNAME in einen
  TXT-Record um und die DKIM-Prüfung schlägt fehl.

Danach in Brevo **„Authenticate this email domain“** klicken. Bei Erfolg stehen
Brevo-Code, DKIM und DMARC auf „Value matched“.

### MX-Record und Empfang (Cloudflare Email Routing)

Eingerichtet: Cloudflare → **Email → Email Routing** → _Get started_. Cloudflare
setzt die MX-Records (`route1/2/3.mx.cloudflare.net`) selbst.

- `hallo@pfotennetz.app` → privates Postfach (Support-Adresse fürs Play-Listing)
- `dmarc@pfotennetz.app` → privates Postfach (DMARC-Reports)

**Achtung beim Aktivieren:** Cloudflare überschreibt den bestehenden SPF-Record
mit `v=spf1 include:_spf.mx.cloudflare.net ~all` – der Brevo-Include geht dabei
verloren. Danach beide zusammenführen:

```
v=spf1 include:spf.brevo.com include:_spf.mx.cloudflare.net ~all
```

Ohne funktionierende Empfangsadresse laufen DMARC-Reports ins Leere.

## 3. SMTP-Zugangsdaten in `.env`

Brevo → **Settings → SMTP & API → SMTP**: dort stehen Login und Passwort
(„Master password“ bzw. generierter SMTP-Key). Nicht das Kontopasswort raten –
exakt aus diesem Tab übernehmen.

```env
AUTH_MAIL_SMTP_HOST=smtp-relay.brevo.com
AUTH_MAIL_SMTP_PORT=587
AUTH_MAIL_SMTP_USER=<Brevo-SMTP-Login>
AUTH_MAIL_SMTP_PASS=<Brevo-SMTP-Key>
AUTH_MAIL_FROM=noreply@pfotennetz.app
AUTH_MAIL_FROM_NAME=PfotenNetz
AUTH_MAIL_RATE_LIMIT=60
```

`AUTH_MAIL_FROM` muss eine Adresse der authentifizierten Domain sein. Falls
Supabase die Adresse ablehnt (bei eigenen SMTP-Setups verlangt es teilweise eine
verifizierte Projekt-Mitgliedsadresse), eine im Supabase-Team verifizierte
Adresse verwenden und in Brevo als Sender freischalten.

`.env` steht in `.gitignore` – die Werte dürfen nicht ins Repo.

## 4. Konfiguration anwenden

```powershell
pnpm auth:mail --apply                      # SMTP + Rate Limit + deutsche Texte
pnpm auth:mail                              # Dry-Run: zeigt nur, was geändert würde
pnpm auth:mail --apply --templates-only     # nur Betreffzeilen/Templates
pnpm auth:mail --check                      # DNS-Status prüfen (Brevo-Code, SPF, DKIM, DMARC, MX)
```

Das Skript (`scripts/configure-auth-mail.mjs`) patcht per Management API:

- `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_admin_email`,
  `smtp_sender_name`, `smtp_max_frequency` (10 s Mindestabstand)
- `rate_limit_email_sent` (Standard 60/Stunde, per `AUTH_MAIL_RATE_LIMIT`)
- deutsche Betreffzeilen und Templates für Bestätigung, Passwort-Reset,
  Magic Link, Einladung, E-Mail-Wechsel und Reauthentifizierung

Die Templates nutzen ausschließlich Supabase-Platzhalter
(`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .NewEmail }}`), damit Links und
Codes weiter funktionieren.

## 5. Testen

1. App oder Web: „Passwort vergessen?“ mit einer echten Adresse auslösen.
2. Mail im Postfach öffnen → Betreff „Passwort für PfotenNetz zurücksetzen“.
3. Im Mail-Header prüfen: `spf=pass`, `dkim=pass`, `dmarc=pass`
   (Gmail: „Original anzeigen“).
4. Link anklicken → Passwort-Reset muss durchlaufen.

DNS-Prüfung ohne Warten auf Caches:

```powershell
pnpm auth:mail --check
```

Das prüft Brevo-Code, SPF, beide DKIM-CNAMEs, DMARC und den MX-Record und sagt,
was noch fehlt.

## 6. Fehlersuche

| Symptom                                             | Ursache                                                                               | Lösung                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Supabase: `500 Error sending recovery email`        | SMTP lehnt die Verbindung ab – Details stehen in Brevo unter **Transactional → Logs** | Credentials/Sender prüfen                                                                   |
| Brevo antwortet `525 5.7.1 Unauthorized IP address` | **IP-Sperre** für SMTP-Keys aktiv (`Settings → Security → Authorized IPs`)            | Bei „SMTP keys“ auf **„Deactivate for SMTP keys“** – Supabase hat keine festen Ausgangs-IPs |
| Brevo: `535 Authentication failed`                  | API-Key statt SMTP-Key, oder Key gelöscht                                             | neuen SMTP-Key erzeugen                                                                     |
| Brevo: `553 sender not allowed`                     | Absenderadresse nicht von der authentifizierten Domain                                | `AUTH_MAIL_FROM` auf `@pfotennetz.app` ändern                                               |
| Mails landen im Spam                                | DMARC/SPF/DKIM noch nicht überall propagiert oder Empfänger filtert streng            | Header prüfen, DMARC-Reports abwarten                                                       |

Schneller Test der Zugangsdaten ohne Supabase (STARTTLS + AUTH LOGIN, sendet
keine Mail): siehe `smtp-check`-Skript im Chatverlauf – bei Erfolg antwortet
Brevo mit `235`, bei IP-Sperre mit `525`.

## 7. Vor der Produktionsfreigabe

- [ ] SMTP aktiv, Testmail mit `spf/dkim/dmarc=pass` angekommen
- [ ] E-Mail-Bestätigung wieder einschalten:
      `@{ mailer_autoconfirm = $false }` per Management API (Snippet in
      `docs/ENVIRONMENT_SETUP.md`)
- [ ] DMARC von `p=none` auf `p=quarantine` stellen, sobald alles sauber läuft
- [ ] `AUTH_MAIL_RATE_LIMIT` an das Brevo-Kontingent anpassen (Free: 300/Tag)
- [ ] Bei Bedarf Brevo-Branding/Absendername prüfen

## Warum nicht der Supabase-Mailer?

Der eingebaute Mailer ist für Produktion nicht gedacht: 2 Mails/Stunde, kein
eigener Absender, keine eigenen Templates im Free-Tier. Genau daran ist die
Registrierung im Screenshot gescheitert (`email rate limit exceeded`).
