# Pine Labs Online Payments setup

This application integrates **Pine Labs Online Payments** through its hosted
redirect checkout. The storefront never receives a card number, UPI PIN, API
credential, or webhook secret.

> Do not use the older Pine One/POS reporting credentials for this integration.
> They are a separate product and cannot create an Online Payments checkout.

## What Pine Labs must provide

Request the following specifically for the **Online Payments / Plural Payment
Gateway** account:

1. Production `client_id` and `client_secret` for server-to-server OAuth.
2. The Base64 webhook signing secret.
3. Confirmation that hosted **UPI, cards, and net banking** are enabled for
   this merchant.
4. Registration of this production webhook URL:

   ```text
   https://api.restoralai.com/api/payments/pinelabs/webhook
   ```

   Subscribe to at least the payment-success and payment-failure order events.
   The backend verifies the HMAC signature against the raw request body, rejects
   stale callbacks, and then reads the order from Pine Labs before marking it
   paid.

Pine Labs documents webhook registration through their support/onboarding
channel, so do not expose the endpoint publicly in a dashboard until the secret
has been configured on the server.

## Production environment

Set these as secrets on the API service only (VPS environment file or deployment
secret store). Never add them to the Vite frontend or commit them to Git.

```dotenv
# Exact public Vercel storefront origin, with no trailing slash.
FRONTEND_URL=https://<your-storefront-domain>

PINELABS_ENABLED=true
PINELABS_ENV=production
PINELABS_CLIENT_ID=<Online Payments production client ID>
PINELABS_CLIENT_SECRET=<Online Payments production client secret>
PINELABS_WEBHOOK_SECRET=<Base64 webhook signing secret>
PINELABS_WEBHOOK_TOLERANCE_SECONDS=300
PINELABS_ALLOWED_PAYMENT_METHODS=UPI,CARD,NETBANKING
```

Keep `PINELABS_ENABLED=false` until every value is present and Pine Labs has
registered the webhook. With the gateway disabled or incomplete, the public
providers endpoint reports Pine Labs as unavailable and the checkout UI does
not display it.

For UAT, use `PINELABS_ENV=sandbox` and Pine Labs' UAT credentials. The service
uses Pine Labs' documented UAT endpoint by default; an explicit
`PINELABS_API_BASE_URL` is available only when Pine Labs supplies a different
tenant endpoint.

## Go-live verification

1. Deploy the backend and frontend together.
2. Confirm `GET /api/payments/providers` returns `pinelabs: true` without
   exposing any secret.
3. Place a small UAT order using hosted checkout. Confirm that the amount in the
   Pine Labs page matches the storefront amount exactly.
4. Complete, fail, and abandon separate test payments. In each case, refresh the
   return page and verify that status is read from the API, not inferred from a
   browser redirect.
5. Confirm a signed webhook reaches the URL above. Duplicate callbacks must not
   fulfil an order or decrement stock twice.
6. Repeat the same checks with production credentials and a low-value real
   transaction before advertising the payment option.

## Reference material

- [OAuth token generation](https://www.pinelabs.com/docs/online-payments/api/authentication/generate-token)
- [Hosted checkout order creation](https://www.pinelabs.com/docs/online-payments/api/checkout/generate-checkout-link)
- [Server-side order status lookup](https://www.pinelabs.com/docs/online-payments/api/orders/get-order-by-id)
- [Webhook signature verification](https://www.pinelabs.com/docs/online-payments/developer-tools/webhooks/signature-verification)
- [Webhook registration and delivery](https://www.pinelabs.com/docs/online-payments/developer-tools/webhooks)
