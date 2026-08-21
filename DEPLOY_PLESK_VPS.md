# Deployment Guide — Plesk VPS

This guide describes the production update procedure for **The Spot Central Hostel Management**. The production application is served through Plesk/Phusion Passenger and supervised by PM2.

## Production locations

| Item | Value |
|---|---|
| Application directory | `/var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs` |
| Production URL | `https://management.thespotcentralhostel.com/` |
| PM2 application name | `hostel_management_app` |
| PM2 entry point | `dist/index.js` |
| Node environment | `production` |
| Database | MySQL (`hostel_management`) |

## Before updating

Connect to the VPS by SSH, then create a database backup from Plesk or with the MySQL backup facility available on the server. Do not overwrite `.env`; it contains production credentials and must remain outside Git.

Confirm the application directory and inspect the current process state:

```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs
pm2 status hostel_management_app
```

## Standard update procedure

Run the following commands in order. Stop if `pnpm build` fails; the existing PM2 process continues serving the previous compiled version until it is reloaded.

```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs
git pull origin main
pnpm install --frozen-lockfile
pnpm build
pm2 startOrReload ecosystem.config.js --update-env
pm2 status hostel_management_app
```

The PM2 configuration uses `dist/index.js`, restarts automatically after failures, and keeps a single production instance. Its logs are kept under `./logs/` in the application directory.

## Database migrations

Apply schema changes **before** testing a feature that depends on new columns or enum values. Review each SQL file first and apply it through the Plesk database interface or the MySQL CLI. Recent production changes are consolidated in `SQL_ACTUALIZACION_PRODUCCION_RECIENTE.sql`.

For example:

```bash
mysql -u DATABASE_USER -p hostel_management < SQL_ACTUALIZACION_PRODUCCION_RECIENTE.sql
```

For the current version, apply the consolidated update first and then the issued-invoices migration, each **once** and only after making a backup:

```bash
mysql -u DATABASE_USER -p hostel_management < SQL_ACTUALIZACION_PRODUCCION_RECIENTE.sql
mysql -u DATABASE_USER -p hostel_management < SQL_FACTURAS_EMITIDAS.sql
```

`SQL_FACTURAS_EMITIDAS.sql` creates the `issued_invoices` table required by the **Facturas emitidas** section. Keeping this script separate makes it easier to review and apply on production.

Use real credentials only on the VPS. Never commit `.env`, database backups, API keys, guest documents, or generated police records.

## Required environment values

The VPS `.env` must retain the existing database and authentication values. For invoice OCR, configure the OpenAI key in the app settings panel rather than committing it. To display a logo in public online check-in forms, set a public image URL in:

```env
VITE_APP_LOGO=https://your-domain.example/path/to/logo.png
```

After changing any `VITE_` value, rebuild and reload PM2 using the standard procedure above.

## Validation after deployment

Open the production URL in a private browser window and verify login, Dashboard, Caja, Facturas, Check-in, and one public online check-in link. For features that introduced schema changes, verify both the administrative screen and its public guest-facing flow.

Check runtime status and the latest server output:

```bash
pm2 status hostel_management_app
pm2 logs hostel_management_app --lines 80
```

Do not leave `pm2 logs` running when you are finished; use `Ctrl+C` to return to the shell.

## Recovery procedure

If an update fails after compilation but before reload, do not reload PM2. Resolve the build failure or restore the previous Git commit. If the reload has already occurred and the site is unavailable, first inspect the logs. Then restore the last known-good release through Git and rebuild:

```bash
git log --oneline -10
git checkout <known-good-commit>
pnpm install --frozen-lockfile
pnpm build
pm2 startOrReload ecosystem.config.js --update-env
```

Do not use destructive database operations to recover application code. Restore a database backup only when the migration itself caused a confirmed data issue.

## Uploading a compiled release instead of Git

When an update is delivered as a compiled package, upload the content of the provided `dist` directory directly to `httpdocs` through the Plesk file manager or FTP, preserving the server `.env` and `ecosystem.config.js`. Then run:

```bash
cd /var/www/vhosts/thespotcentralhostel.com/management.thespotcentralhostel.com/httpdocs
pm2 startOrReload ecosystem.config.js --update-env
```

The preferred operational method remains Git updates because it keeps source, schema scripts, and deployment configuration aligned.
