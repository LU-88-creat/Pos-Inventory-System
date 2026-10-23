# Backend setup

## Daraja sandbox STK Push

1. Run `sales/migrations/create_mpesa_transactions.sql` against the database configured in this backend.
2. Fill in the `MPESA_*` settings in `.env` using values from your Daraja sandbox app. Keep the consumer secret, passkey, and callback token private.
3. Set `MPESA_CALLBACK_URL` to a public HTTPS callback address ending in `/api/sales/mpesa/callback`. For local development, expose the backend with an HTTPS tunnel and use its forwarding URL.
4. Set `MPESA_CALLBACK_TOKEN` to a long random secret (at least 32 characters). You can generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. The backend appends it as the `token` query parameter and checks it on callback requests.
5. Restart the backend after changing `.env`.

The POS sends the STK request from the backend, checks the callback-backed payment status, and only then completes the sale and deducts stock. Daraja requires whole-shilling STK amounts; the POS rounds to the nearest shilling and shows the rounding adjustment on the receipt.

Use `MPESA_ENV=sandbox` while testing. Do not switch to production until production Daraja credentials, shortcode, passkey, and a production-reachable HTTPS callback URL are configured.
