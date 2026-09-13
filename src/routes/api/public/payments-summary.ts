import { createFileRoute } from "@tanstack/react-router";

// Public aggregate facade over the Supabase REST API for payments.
// Auth: requires a signed-in user's access token as `Authorization: Bearer <token>`.
// RLS applies as that user.

const SUPABASE_URL = "https://jpgqxztxaqgvvuqzahpo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pE8NhYMrmY-etRqrXDTrlw_V8uZGXTt";

function parseContentRange(header: string | null): number {
  if (!header) return 0;
  const slash = header.lastIndexOf("/");
  if (slash === -1) return 0;
  const n = Number(header.slice(slash + 1));
  return Number.isFinite(n) ? n : 0;
}

export const Route = createFileRoute("/api/public/payments-summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
          return new Response(
            JSON.stringify({ error: "Missing Authorization: Bearer <access_token>" }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }

        try {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/payments?select=id,amount,status,method,created_at&order=created_at.desc`,
            {
              headers: {
                apikey: SUPABASE_PUBLISHABLE_KEY,
                Authorization: auth,
                Prefer: "count=exact",
              },
            },
          );
          if (!res.ok) {
            throw new Error(`payments request failed: ${res.status}`);
          }
          const rows = (await res.json()) as any[];
          const total = parseContentRange(res.headers.get("content-range"));

          const byStatus: Record<string, number> = { pending: 0, applied: 0, failed: 0 };
          const byMethod: Record<string, number> = {};
          let totalAmount = 0;
          let pendingAmount = 0;
          for (const r of rows) {
            const status = String(r.status ?? "unknown").toLowerCase();
            byStatus[status] = (byStatus[status] ?? 0) + 1;
            const method = String(r.method ?? "unknown").toLowerCase();
            byMethod[method] = (byMethod[method] ?? 0) + 1;
            const amt = Number(r.amount) || 0;
            totalAmount += amt;
            if (status === "pending") pendingAmount += amt;
          }

          return new Response(
            JSON.stringify({
              total,
              totalAmount,
              pendingAmount,
              byStatus,
              byMethod,
              latest: rows.slice(0, 5).map((r) => ({
                id: r.id,
                amount: r.amount,
                status: r.status,
                method: r.method,
                created_at: r.created_at,
              })),
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message ?? "payments summary failed" }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
