# VPS deployment

This directory runs the Express API behind Caddy. Caddy obtains and renews the
TLS certificate for `api.restoralai.com`; do not start the proxy until that DNS
name has an A record pointing at the VPS.

## One-time server setup

On an Ubuntu/Debian VPS, install Docker Engine and the Compose plugin, then
allow inbound TCP ports 80 and 443. Keep SSH restricted to the administrator's
known IP or VPN where possible.

Clone this repository under `/opt/vybe`. Copy `.env.production.example` to
`.env`, supply the production values in the copy, and restrict it to root:

```sh
cd /opt/vybe/deploy
cp .env.production.example .env
chmod 600 .env
docker compose up -d --build
```

Verify the public service only after DNS and TLS are ready:

```sh
curl --fail https://api.restoralai.com/api/health
```

## PhonePe cutover

1. Set the Vercel frontend's `VITE_API_URL` to `https://api.restoralai.com/api`
   and deploy it.
2. Update the PhonePe webhook URL to
   `https://api.restoralai.com/api/payments/phonepe/webhook`.
3. Set `PHONEPE_ENABLED=true` in `deploy/.env`, run `docker compose up -d`,
   and make a low-value production payment.
4. Confirm the webhook marks its order paid before disabling PhonePe on Render.

Do not run two live PhonePe backends for longer than the validation window.

## Pine Labs cutover

1. Obtain **Pine Labs Online Payments / Plural** production credentials. Do not
   use Pine One/POS reporting credentials for checkout.
2. Have Pine Labs register
   `https://api.restoralai.com/api/payments/pinelabs/webhook` and provide the
   Base64 webhook-signing secret.
3. Add the `PINELABS_*` values to `deploy/.env`, then set
   `PINELABS_ENABLED=true`.
4. Run `docker compose up -d --build` and confirm that
   `https://api.restoralai.com/api/payments/providers` reports
   `"pinelabs":true`.
5. Make a small real payment and confirm that the webhook marks the order paid
   before showing the option to customers. See
   [`backend/PINELABS_SETUP.md`](../backend/PINELABS_SETUP.md) for the complete
   test checklist.

## Pine Labs POS reporting

The POS transaction-summary integration is independent of the checkout
gateway. Add the `PINELABS_POS_*` values to `deploy/.env`, rebuild with
`docker compose up -d --build`, and access reports only through the authenticated
admin API. See [`backend/PINELABS_POS_REPORTING.md`](../backend/PINELABS_POS_REPORTING.md).
