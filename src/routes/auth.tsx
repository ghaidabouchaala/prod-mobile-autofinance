import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: () => (
    <AuthProvider>
      <AuthPage />
    </AuthProvider>
  ),
});

function AuthPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) setError(err);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background px-8 pt-20">
      <div className="mb-10">
        <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-primary ring-1 ring-black/5">
          <FileText className="size-6 text-primary-foreground" strokeWidth={2.4} />
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance">
          Welcome to AutoFinance
        </h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          Sign in to manage contract funding and dealer accounts.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="ml-1 text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="h-12 w-full rounded-xl bg-surface px-4 text-[15px] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="ml-1 text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="h-12 w-full rounded-xl bg-surface px-4 text-[15px] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-status-sentback-bg px-4 py-3 text-sm text-status-sentback-fg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 h-12 w-full rounded-xl bg-primary font-medium text-primary-foreground ring-2 ring-primary/20 transition active:scale-[.98] disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div className="mt-auto py-8 text-center">
        <span className="text-xs uppercase tracking-widest text-muted-foreground/70">
          Secured Compliance Environment
        </span>
      </div>
    </div>
  );
}
