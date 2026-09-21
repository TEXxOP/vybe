# Pine Labs POS transaction reporting

This is the **Pine Labs POS transaction-summary API**, separate from the Pine
Labs Online Payments / Plural checkout integration. It is for reconciliation of
transactions taken through Pine Labs terminals; it does not initiate customer
payments and it does not affect PhonePe or hosted Pine Labs checkout.

## Security model

- The credentials live only in the API service's secret environment.
- The browser never receives the Basic-authentication header or the client
  secret.
- The report endpoint is restricted to authenticated admin users and sends
  `Cache-Control: no-store`.
- Known credential fields and PAN-like values are redacted before any provider
  response is sent to the admin browser.

## Server configuration

Add these values to the VPS `deploy/.env`, not to the frontend and not to Git:

```dotenv
PINELABS_POS_REPORTING_ENABLED=true
PINELABS_POS_API_BASE_URL=https://api-c.pinelabs.com
PINELABS_POS_CLIENT_ID=<Pine Labs POS client ID>
PINELABS_POS_CLIENT_SECRET=<Pine Labs POS client secret>
PINELABS_POS_REQUEST_TIMEOUT_MS=15000
```

Restart the API after adding the values:

```sh
cd /opt/vybe/deploy
docker compose up -d --build
```

## Admin API

After deployment, an admin can retrieve a paged date range through this app API:

```text
GET /api/reports/pinelabs/transactions/summary
    ?fromDate=2026-06-30T00:00:00
    &toDate=2026-08-04T00:00:00
    &page=0
    &size=100
```

`fromDate` and `toDate` are required ISO-8601 timestamps. The app limits page
size to 1,000 records to keep the admin session and API memory bounded; fetch
subsequent pages instead of a single bulk response.

Pine Labs supplied the upstream request as `GET /transactions/summary` with a
JSON body. The server deliberately uses Node's HTTPS client rather than
`fetch`, because standard `fetch` rejects GET requests with a body. It preserves
Pine Labs' required method, Basic authentication, date payload, and pagination
without exposing those details to the browser.
