# AutoFinance Mobile — Full API Reference for Testing

- **App host (published):** `https://prod-autofinance-mobile.lovable.app`
- **Database host (Supabase):** `https://jpgqxztxaqgvvuqzahpo.supabase.co`
- **Publishable key (always sent as the `apikey` header):**
  `sb_publishable_pE8NhYMrmY-etRqrXDTrlw_V8uZGXTt`
- **Android package ID:** `com.autofinance.mobile`

Two kinds of endpoints exist:

| Kind | Host | Purpose |
| --- | --- | --- |
| Aggregate endpoints (`/api/public/*`) | app host | One call → ready-made numbers for assertions |
| Raw data endpoints (`/rest/v1/*`) | Supabase host | Full row access, filters, updates |

**Golden rule:** `apikey` is always the publishable key.
`Authorization: Bearer ...` is always the **access_token from sign-in** — never the publishable key, never a Thundercode key.

---

## 0. Sign in (get an access_token)

```
POST https://jpgqxztxaqgvvuqzahpo.supabase.co/auth/v1/token?grant_type=password
```

Headers

| Header | Value |
| --- | --- |
| `apikey` | `sb_publishable_pE8NhYMrmY-etRqrXDTrlw_V8uZGXTt` |
| `Content-Type` | `application/json` |

Body

```json
{ "email": "funding@test.com", "password": "<the account password>" }
```

200 response (abbreviated)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refresh_token": "v1.MC4w...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": { "id": "...", "email": "funding@test.com" }
}
```

Errors

| Status | Body | Cause |
| --- | --- | --- |
| 400 | `{"error":"invalid_grant","error_description":"Invalid login credentials"}` | Wrong email/password, or the account does not exist |
| 401 | `{"message":"No API key found in request"}` | `apikey` header missing |

In Thundercode, if this is step 1, later steps reference the token as
`{{API_RESPONSE_1.access_token}}`.

---

## 1. Dashboard Stats (aggregate)

```
GET https://prod-autofinance-mobile.lovable.app/api/public/dashboard-stats
```

Headers: `Authorization: Bearer <access_token>`

200 response

```json
{
  "contractsCount": 3,
  "totalValue": 69345,
  "activeDealers": 5,
  "pendingCount": 3
}
```

| Field | Meaning |
| --- | --- |
| `contractsCount` | Total contracts visible to this user |
| `totalValue` | Sum of all contract amounts |
| `activeDealers` | Total dealers |
| `pendingCount` | Contracts with status `pending` |

---

## 2. Contracts Summary (aggregate)

```
GET https://prod-autofinance-mobile.lovable.app/api/public/contracts-summary
```

Headers: `Authorization: Bearer <access_token>`

200 response

```json
{
  "total": 3,
  "totalValue": 69345,
  "averageValue": 23115,
  "minValue": 12000,
  "maxValue": 44345,
  "byStatus": {
    "pending": 3,
    "under_review": 0,
    "approved": 0,
    "funded": 0,
    "rejected": 0
  },
  "latest": [
    { "id": "...", "status": "pending", "amount": 25000, "created_at": "2026-09-01T10:00:00Z" }
  ]
}
```

`latest` holds the 5 most recent contracts, newest first.

---

## 3. Payments Summary (aggregate)

```
GET https://prod-autofinance-mobile.lovable.app/api/public/payments-summary
```

Headers: `Authorization: Bearer <access_token>`

200 response

```json
{
  "total": 4,
  "totalAmount": 51200,
  "pendingAmount": 12000,
  "byStatus": { "pending": 1, "applied": 3, "failed": 0 },
  "byMethod": { "wire": 2, "ach": 1, "check": 1 },
  "latest": [
    { "id": "...", "amount": 12000, "status": "pending", "method": "wire", "created_at": "2026-09-01T10:00:00Z" }
  ]
}
```

Note: users with the *contract funding specialist* role cannot see payments, so
this may legitimately return zeros for that account.

---

### Shared errors for §1–§3

| Status | Body | Cause |
| --- | --- | --- |
| 401 | `{ "error": "Missing Authorization: Bearer <access_token>" }` | No / malformed Bearer token |
| 502 | `{ "error": "contracts request failed: 403" }` | Token rejected or RLS denied |
| 404 (HTML) | — | You called the old host, or the latest version was never published |

---

## 4. List Contracts (raw)

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/contracts?select=id,status,amount
```

Headers

| Header | Value |
| --- | --- |
| `apikey` | publishable key |
| `Authorization` | `Bearer <access_token>` |
| `Prefer` | `count=exact` (optional — enables total via `Content-Range`) |

200 response

```json
[
  { "id": "...", "status": "pending", "amount": 25000 },
  { "id": "...", "status": "funded", "amount": 44345 }
]
```

Total count is in the `Content-Range` response header, e.g. `0-1/2` → 2 rows.

Useful query options: `&status=eq.pending`, `&order=created_at.desc`, `&limit=5`.

---

## 5. Get a Single Contract

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/contracts?id=eq.<contract_id>&select=*
```

Headers: same as §4 (no `Prefer` needed). Returns an array with 0 or 1 item.

---

## 6. Update Contract Status (send-back / approve / fund)

```
PATCH https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/contracts?id=eq.<contract_id>
```

Headers

| Header | Value |
| --- | --- |
| `apikey` | publishable key |
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |
| `Prefer` | `return=representation` |

Body

```json
{ "status": "rejected" }
```

Allowed values: `pending`, `under_review`, `approved`, `funded`, `rejected`.
Status changes are logged automatically to `contract_status_history`.

---

## 7. List Dealers

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/dealers?select=id&limit=0
```

Headers: same as §4 with `Prefer: count=exact`.
Empty body, but `Content-Range: */5` → 5 dealers.

Drop `&limit=0` and widen `select` to get full dealer rows.

---

## 8. List Payments

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/payments?select=id,amount,status,method
```

Headers: same as §4. Statuses: `pending`, `applied`, `failed`.
Methods: `wire`, `ach`, `check`.

---

## 9. List Documents

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/documents?select=id,type,status
```

Headers: same as §4. Statuses: `pending`, `approved`, `sent_back`, `rejected`.

Document event log:

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/document_events?select=*&document_id=eq.<id>
```

---

## 10. Sign out / refresh

Refresh an expired token:

```
POST https://jpgqxztxaqgvvuqzahpo.supabase.co/auth/v1/token?grant_type=refresh_token
Headers: apikey, Content-Type: application/json
Body: { "refresh_token": "<refresh_token>" }
```

Access tokens expire after 1 hour (`expires_in: 3600`).

---

## Common mistakes

| Mistake | Fix |
| --- | --- |
| `404 NOT_FOUND` from `/functions/v1/...` | There are no edge functions. Use `/rest/v1/...` or the aggregate endpoints above. |
| HTML `404` from an aggregate endpoint | Use host `prod-autofinance-mobile.lovable.app` and republish the app after changes. |
| `401` from an aggregate endpoint | You sent the publishable key as the Bearer token. It must be the sign-in `access_token`. |
| `[ACCESS_TOKEN]` / `[API_KEY]` in the request | Placeholder never replaced. Use `{{API_RESPONSE_1.access_token}}`. |
| Status `0`, `0 ms`, empty response | The request never left the client — malformed URL or missing headers. |
| `403` or empty rows | The token's user has no RLS-visible rows, or their role hides that table. |
| `Content-Range` absent | Add `Prefer: count=exact`. |
| Column error `400` | That column does not exist; `contracts` has no `dealer_name`. |

---

## Suggested end-to-end test flow (Thundercode)

1. **Auth** — `POST .../auth/v1/token?grant_type=password` → save `access_token`.
2. **Dashboard stats** — `GET .../api/public/dashboard-stats` with
   `Bearer {{API_RESPONSE_1.access_token}}` → assert `contractsCount` is a number ≥ 0.
3. **Contracts summary** — `GET .../api/public/contracts-summary` → assert
   `total` equals step 2's `contractsCount` and `byStatus.pending` equals `pendingCount`.
4. **Payments summary** — `GET .../api/public/payments-summary` → assert `total` is a number.
5. **Raw contracts** — `GET .../rest/v1/contracts?select=id` → assert 200 and an array.
6. **Launch app** — `com.autofinance.mobile` → assert the dashboard shows the same
   Total Contracts number returned in step 2.
