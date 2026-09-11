import type { CapacitorConfig } from "@capacitor/cli";

// AutoFinance Mobile — native shell that loads the live web app.
// The web app is an SSR TanStack Start project with server functions, so it
// must be served from Lovable (or wherever you host it) rather than bundled
// offline into the APK. Change `server.url` to your production URL when you
// publish (e.g. https://autofinance.lovable.app).
const config: CapacitorConfig = {
  appId: "com.autofinance.mobile",
  appName: "AutoFinance",
  webDir: "dist",
  server: {
    // Load the /auth route directly. The root route performs a server redirect
    // which can hit the Lovable SSR worker and occasionally fail with a 500; the
    // /auth route is static and loads reliably in the native webview.
    url: "https://prod-autofinance-mobile.lovable.app/auth",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "*.lovable.app",
      "*.supabase.co",
    ],
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
