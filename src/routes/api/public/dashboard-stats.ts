import { createFileRoute } from "@tanstack/react-router";

// Public stats facade over the Supabase REST API.
// Returns aggregate dashboard numbers in one call so external tests
// (Thundercode) can assert against a single JSON body instead of parsing
// Content-Range headers across multiple requests.
//
// Auth: requires a signed-in user's access token as `Authorization: Bearer <token>`.
// The same token the app uses; RLS applies as that user.

const SUPABASE_URL = "https://jpgqxztxaqgvvuqzahpo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pE8NhYMrmY-etRqrXDTrlw_V8uZGXTt";

type Stats = {
  contractsCount: number;
  totalValue: number;
  activeDealers: number;
  pendingCount: number;
};

function parseContentRange(header: string | null): number {
  // formats: "0-2/3" (with rows) or "*/3" (empty result, count still set) or "*/0"
  if (!header) return 0;
  const slash = header.lastIndexOf("/");
  if (slash === -1) return 0;
  const count = header.slice(slash + 1);
  const n = Number(count);
  return Number.isFinite(n) ? n : 0;
}

async function fetchContracts(authHeader: string): Promise<{ rows: any[]; count: number }> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contracts?select=id,status,amount`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: authHeader,
        Prefer: "count=exact",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`contracts request failed: ${res.status}`);
  }
  const rows = (await res.json()) as any[];
  const count = parseContentRange(res.headers.get("content-range"));
  return { rows, count };
}

async function fetchDealersCount(authHeader: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/dealers?select=id`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: authHeader,
      Prefer: "count=exact",
    },
  });
  if (!res.ok) {
    throw new Error(`dealers request failed: ${res.status}`);
  }
  const rows = (await res.json()) as any[];
  return Math.max(parseContentRange(res.headers.get("content-range")), rows.length);
}

export const Route = createFileRoute("/api/public/dashboard-stats")({
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
          const [{ rows, count: contractsCount }, activeDealers] = await Promise.all([
            fetchContracts(auth),
            fetchDealersCount(auth),
          ]);

          const totalValue = rows.reduce(
            (sum, r) => sum + (Number(r.amount) || 0),
            0,
          );
          const pendingCount = rows.filter(
            (r) => String(r.status ?? "").toLowerCase() === "pending",
          ).length;

          const stats: Stats = {
            contractsCount,
            totalValue,
            activeDealers,
            pendingCount,
          };

          return new Response(JSON.stringify(stats), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message ?? "stats fetch failed" }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
