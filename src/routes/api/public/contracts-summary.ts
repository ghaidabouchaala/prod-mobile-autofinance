import { createFileRoute } from "@tanstack/react-router";

// Public aggregate facade over the Supabase REST API for contracts.
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

export const Route = createFileRoute("/api/public/contracts-summary")({
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
            `${SUPABASE_URL}/rest/v1/contracts?select=id,status,amount,created_at&order=created_at.desc`,
            {
              headers: {
                apikey: SUPABASE_PUBLISHABLE_KEY,
                Authorization: auth,
                Prefer: "count=exact",
              },
            },
          );
          if (!res.ok) {
            throw new Error(`contracts request failed: ${res.status}`);
          }
          const rows = (await res.json()) as any[];
          const total = parseContentRange(res.headers.get("content-range"));

          const byStatus: Record<string, number> = {
            pending: 0,
            under_review: 0,
            approved: 0,
            funded: 0,
            rejected: 0,
          };
          let totalValue = 0;
          for (const r of rows) {
            const status = String(r.status ?? "unknown").toLowerCase();
            byStatus[status] = (byStatus[status] ?? 0) + 1;
            totalValue += Number(r.amount) || 0;
          }

          const amounts = rows
            .map((r) => Number(r.amount) || 0)
            .sort((a, b) => a - b);
          const averageValue = amounts.length
            ? Math.round(totalValue / amounts.length)
            : 0;

          return new Response(
            JSON.stringify({
              total,
              totalValue,
              averageValue,
              minValue: amounts[0] ?? 0,
              maxValue: amounts[amounts.length - 1] ?? 0,
              byStatus,
              latest: rows.slice(0, 5).map((r) => ({
                id: r.id,
                status: r.status,
                amount: r.amount,
                created_at: r.created_at,
              })),
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message ?? "contracts summary failed" }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
