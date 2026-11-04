# Backend setup

## Password reset email

1. Run `auth/migrations/create_password_reset_tokens.sql` against the configured database.
2. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and optionally `SMTP_FROM` in the backend `.env`.
3. Set `FRONTEND_URL` to the public frontend origin used in password reset links (for example, `http://localhost:5173` in local development).
4. Restart the backend. Reset links are single-use and expire after one hour. Accounts must have an email address set.

The same SMTP settings are used to email login credentials when an administrator creates an employee account. A valid employee email address is required for new accounts. If SMTP is missing, account creation is rejected; if delivery fails after the account is created, the administrator is notified so credentials can be shared securely.

## Daraja sandbox STK Push

1. Run `sales/migrations/create_mpesa_transactions.sql` against the database configured in this backend.
2. Fill in the `MPESA_*` settings in `.env` using values from your Daraja sandbox app. Keep the consumer secret, passkey, and callback token private.
3. Set `MPESA_CALLBACK_URL` to a public HTTPS callback address ending in `/api/sales/mpesa/callback`. For local development, expose the backend with an HTTPS tunnel and use its forwarding URL.
4. Set `MPESA_CALLBACK_TOKEN` to a long random secret (at least 32 characters). You can generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. The backend appends it as the `token` query parameter and checks it on callback requests.
5. Restart the backend after changing `.env`.

The POS sends the STK request from the backend, checks the callback-backed payment status, and only then completes the sale and deducts stock. Daraja requires whole-shilling STK amounts; the POS rounds to the nearest shilling and shows the rounding adjustment on the receipt.

Use `MPESA_ENV=sandbox` while testing. Do not switch to production until production Daraja credentials, shortcode, passkey, and a production-reachable HTTPS callback URL are configured.
