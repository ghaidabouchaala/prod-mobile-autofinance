# AutoFinance Mobile — API Reference for Testing

Base host: `https://prod-autofinance-mobile.lovable.app`
Supabase host: `https://jpgqxztxaqgvvuqzahpo.supabase.co`
Publishable key (use as `apikey` header): `sb_publishable_pE8NhYMrmY-etRqrXDTrlw_V8uZGXTt`

---

## 0. Authenticate (get an access_token)

Every data call below requires a signed-in user's `access_token`. Get it by
signing in with email + password.

```
POST https://jpgqxztxaqgvvuqzahpo.supabase.co/auth/v1/token?grant_type=password
```

### Headers

| Header          | Value                            |
| --------------- | -------------------------------- |
| `apikey`        | `sb_publishable_pE8NhYMrmY-etRqrXDTrlw_V8uZGXTt` |
| `Content-Type`  | `application/json`               |

### Body (JSON)

```json
{
  "email": "funding@test.com",
  "password": "<the account password>"
}
```

### 200 Response (abbreviated)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refresh_token": "v1.MC4w...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": { "id": "...", "email": "funding@test.com" }
}
```

In a multi-step test (e.g. Thundercode), reference the token from step 1 as
`{{API_RESPONSE_1.access_token}}` and pass it in later steps as
`Authorization: Bearer {{API_RESPONSE_1.access_token}}`.

---

## 1. Dashboard Stats (single-call aggregate)

Returns all KPI numbers shown on the mobile dashboard in one JSON body.

```
GET https://prod-autofinance-mobile.lovable.app/api/public/dashboard-stats
```

### Headers

| Header           | Value                                  |
| ---------------- | -------------------------------------- |
| `apikey`         | `sb_publishable_pE8NhYMrmY-etRqrXDTrlw_V8uZGXTt` |
| `Authorization` | `Bearer <access_token>`                |

### 200 Response

```json
{
  "contractsCount": 3,
  "totalValue": 69345,
  "activeDealers": 5,
  "pendingCount": 3
}
```

### Error responses

| Status | Body                                                        | Cause                                   |
| ------ | ----------------------------------------------------------- | --------------------------------------- |
| 401    | `{ "error": "Missing Authorization: Bearer <access_token>" }` | No / malformed Bearer token             |
| 502    | `{ "error": "contracts request failed: 403" }`            | Token rejected by Supabase / RLS denied |

---

## 2. List Contracts (Supabase REST, raw)

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/contracts?select=id,status,amount
```

### Headers

| Header           | Value                                   |
| ---------------- | --------------------------------------- |
| `apikey`         | `sb_publishable_pE8NhYMrmY-etRqrXDTrlw_V8uZGXTt` |
| `Authorization`  | `Bearer <access_token>`                 |
| `Prefer`         | `count=exact` (optional — enables total count via `Content-Range`) |

### 200 Response (array)

```json
[
  { "id": "...", "status": "pending", "amount": 25000 },
  { "id": "...", "status": "funded", "amount": 44345 }
]
```

Total count is in the response header `Content-Range`, e.g.
`Content-Range: 0-1/2` → 2 contracts total.

---

## 3. List Dealers (Supabase REST, count only)

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/dealers?select=id&limit=0
```

### Headers

Same as §2 (`apikey`, `Authorization`, `Prefer: count=exact`).

### Response

Empty body, but `Content-Range: */5` → 5 dealers total.

---

## 4. Get a Single Contract

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/contracts?id=eq.<contract_id>&select=*
```

Headers: same as §2 (no `Prefer` needed).

---

## 5. Update Contract Status (send-back / fund / approve)

```
PATCH https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/contracts?id=eq.<contract_id>
```

### Headers

| Header           | Value                                   |
| ---------------- | --------------------------------------- |
| `apikey`         | `sb_publishable_pE8NhYMrmY-etRqrXDTrlw_V8uZGXTt` |
| `Authorization`  | `Bearer <access_token>`                |
| `Content-Type`   | `application/json`                      |
| `Prefer`         | `return=representation`                 |

### Body

```json
{ "status": "rejected" }
```

Allowed values: `pending`, `under_review`, `approved`, `funded`, `rejected`.

---

## 6. List Payments

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/payments?select=id,amount,status,method
```

Headers: same as §2.

---

## 7. List Documents

```
GET https://jpgqxztxaqgvvuqzahpo.supabase.co/rest/v1/documents?select=id,type,status
```

Headers: same as §2.

---

## Quick reference — common mistakes

| Mistake | Fix |
| --- | --- |
| `404 NOT_FOUND` from `/functions/v1/...` | There is no edge function at that path. Use `/rest/v1/...` or the dashboard-stats route above. |
| `401` from dashboard-stats | You sent the publishable key as the Bearer token. The Bearer value must be the **access_token** from §0. |
| `403` / empty rows | The token's user has no RLS-visible rows. Confirm the account exists and has a profile. |
| `apikey` header missing | Every Supabase REST call needs `apikey: sb_publishable_...`. |
| `Content-Range` absent | Add `Prefer: count=exact`; without it Supabase omits the total. |

---

## Suggested test flow (Thundercode)

1. **Auth** — `POST .../auth/v1/token?grant_type=password` → save `access_token`.
2. **Stats** — `GET .../api/public/dashboard-stats` with `Bearer {{API_RESPONSE_1.access_token}}` → assert `contractsCount` is a number ≥ 0.
3. **Contracts** — `GET .../rest/v1/contracts?select=id` → assert status 200 and response is an array.
4. **Launch app** — `com.autofinance.mobile` → assert the dashboard renders the same `contractsCount`.
