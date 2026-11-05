# Paytm Standard JS Checkout

The API creates Paytm transactions and verifies status server-side. Keep the
merchant key on the API host; never put it in Vite variables or browser code.

## Production configuration

Set these on the backend service after Paytm has enabled the production MID:

```text
PAYTM_ENABLED=true
PAYTM_ENV=production
PAYTM_MID=<production MID>
PAYTM_MERCHANT_KEY=<production merchant key>
PAYTM_WEBSITE_NAME=DEFAULT
PAYTM_CHANNEL_ID=WEB
PAYTM_PUBLIC_API_URL=https://api.restoralai.com
PAYTM_API_BASE_URL=
```

Paytm's production host is `https://secure.paytmpayments.com`. The callback URL
to register with Paytm is:

```text
https://api.restoralai.com/api/payments/paytm/callback
```

The storefront return page is:

```text
https://www.restoralai.com/payment/paytm/return
```

## Flow and verification

1. The backend calculates the payable total from its product catalog and
   creates an internal order.
2. It signs and sends Paytm's Initiate Transaction request, then returns only
   the merchant ID, order ID, transaction token, and amount to the browser.
3. The storefront invokes Paytm JS Checkout. Card and UPI details stay with
   Paytm.
4. The callback is checksum-verified, and the backend calls Paytm's Order
   Status API before marking an order paid. The reported amount must match the
   server-calculated total.

Check `GET /api/payments/providers` to confirm the provider is configured.
That only checks configuration presence. A production checkout was confirmed
by the merchant; UAT credentials were not generated in the portal, so UAT
sign-off remains pending.
