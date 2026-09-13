import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MobileShell } from "@/components/mobile-shell";
import { StatusPill } from "@/components/status-pill";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contracts")({
  component: ContractsPage,
});

const FILTERS = ["all", "pending", "funded", "sent_back"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  pending: "Pending",
  funded: "Funded",
  sent_back: "Sent Back",
};

function ContractsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const { data: dealers } = useQuery({
    queryKey: ["dealers-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealers").select("*");
      if (error) return [];
      return data ?? [];
    },
  });

  const dealerNameById = new Map<string, string>();
  for (const d of dealers ?? []) {
    const id = String((d as any).id ?? "");
    const name = (d as any).name ?? (d as any).dealer_name ?? (d as any).company ?? null;
    if (id && name) dealerNameById.set(id, String(name));
  }

  const { data, isLoading } = useQuery({
    queryKey: ["contracts", filter],
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((c: any) => {
    if (filter !== "all" && String(c.status ?? "").toLowerCase() !== filter) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return [c.contract_number, dealerLabel(c, dealerNameById)]
      .filter(Boolean)
      .some((v: string) => String(v).toLowerCase().includes(needle));
  });

  return (
    <MobileShell title="Contracts">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by dealer or contract #"
          className="h-11 w-full rounded-xl bg-surface pl-11 pr-4 text-sm outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            id={`filter-chip-${f}`}
            type="button"
            aria-label={FILTER_LABELS[f]}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
              filter === f
                ? "bg-foreground text-background"
                : "bg-surface text-muted-foreground ring-1 ring-black/5"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="divide-y divide-black/5 rounded-[20px] bg-surface ring-1 ring-black/5">
        {isLoading && (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading contracts…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No contracts match.
          </div>
        )}
        {filtered.map((c: any) => (
          <Link
            key={c.id}
            id={`contract-row-${c.contract_number ?? c.id}`}
            to="/contracts/$id"
            params={{ id: String(c.id) }}
            aria-label={`Contract ${c.contract_number ?? c.id}`}
            className="flex items-center justify-between gap-3 p-4 transition active:bg-black/[.02]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {dealerLabel(c, dealerNameById)}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {c.contract_number ?? String(c.id).slice(0, 8)}
                {c.amount != null ? ` • ${formatCurrency(Number(c.amount))}` : ""}
              </p>
            </div>
            <StatusPill status={c.status ?? "pending"} />
          </Link>
        ))}
      </div>
    </MobileShell>
  );
}

function dealerLabel(c: any, map: Map<string, string>): string {
  const dealerId = c.dealer_id != null ? String(c.dealer_id) : null;
  if (dealerId && map.has(dealerId)) return map.get(dealerId)!;
  if (c.dealer_name) return String(c.dealer_name);
  if (typeof c.dealer === "string" && c.dealer) return c.dealer;
  if (dealerId) return dealerId;
  return "Unknown dealer";
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
