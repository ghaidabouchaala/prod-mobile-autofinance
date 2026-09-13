import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { MobileShell } from "@/components/mobile-shell";
import { StatusPill } from "@/components/status-pill";

export const Route = createFileRoute("/_authenticated/contracts/$id")({
  component: ContractDetailPage,
});

function ContractDetailPage() {
  const { id } = Route.useParams();

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
  });

  const dealerId = contract?.dealer_id != null ? String(contract.dealer_id) : null;

  const { data: dealer } = useQuery({
    queryKey: ["dealer", dealerId],
    enabled: !!dealerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealers")
        .select("*")
        .eq("id", dealerId)
        .maybeSingle();
      if (error) return null;
      return data as Record<string, any> | null;
    },
  });

  const dealerName =
    (dealer?.name ?? dealer?.dealer_name ?? dealer?.company) ??
    contract?.dealer_name ??
    (typeof contract?.dealer === "string" ? contract.dealer : null) ??
    dealerId ??
    "—";

  return (
    <MobileShell title="Contract Detail" back={{ to: "/contracts" }}>
      {isLoading && (
        <div className="rounded-[20px] bg-surface p-6 text-center text-sm text-muted-foreground ring-1 ring-black/5">
          Loading…
        </div>
      )}

      {!isLoading && !contract && (
        <div className="rounded-[20px] bg-surface p-6 text-center text-sm text-muted-foreground ring-1 ring-black/5">
          Contract not found.
        </div>
      )}

      {contract && (
        <div className="space-y-6">
          <section className="space-y-6 rounded-[20px] bg-surface p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contract ID
                </p>
                <h2 className="mt-0.5 truncate text-lg font-semibold">
                  {contract.contract_number ?? String(contract.id).slice(0, 12)}
                </h2>
              </div>
              <StatusPill status={contract.status ?? "pending"} />
            </div>

            <div className="grid grid-cols-2 gap-y-4">
              <Field label="Dealer" value={String(dealerName)} />
              <Field
                label="Amount"
                value={
                  contract.amount != null ? formatCurrency(Number(contract.amount)) : "—"
                }
              />
              <Field
                label="Submitted"
                value={
                  contract.created_at ? formatDate(contract.created_at) : "—"
                }
              />
              <Field label="Tier" value={contract.tier ?? contract.credit_tier ?? "—"} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Raw Contract Data</h3>
            <pre className="overflow-x-auto rounded-[20px] bg-surface p-4 text-[11px] leading-relaxed text-muted-foreground ring-1 ring-black/5">
              {JSON.stringify(contract, null, 2)}
            </pre>
          </section>
        </div>
      )}
    </MobileShell>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
