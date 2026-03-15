import { useEffect, useState } from "react";
import {
  Outlet,
  ScrollRestoration,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { PowerSyncContext, usePowerSyncStatus } from "@powersync/react";
import { powerSyncDatabase } from "../lib/powersync";

export const Route = createRootRoute({
  component: RootComponent,
});

function SyncStatusPill() {
  const syncStatus = usePowerSyncStatus();
  const connected = syncStatus.connected && syncStatus.hasSynced;
  const syncing = syncStatus.connected && !syncStatus.hasSynced;

  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-mono transition-all duration-500 ${
        connected
          ? "bg-green-500/20 text-green-300 border-green-400/30"
          : syncing
          ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
          : "bg-slate-600/30 text-amber-200/50 border-slate-500/30"
      }`}
      title={connected ? "PowerSync connected — syncing to all devices" : syncing ? "PowerSync connecting…" : "Offline — using local SQLite cache"}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          connected
            ? "bg-green-400 animate-pulse"
            : syncing
            ? "bg-amber-400 animate-pulse"
            : "bg-amber-200/30"
        }`}
      />
      {connected
        ? "⚡ PowerSync synced"
        : syncing
        ? "⚡ Syncing…"
        : "○ Offline — local SQLite"}
    </span>
  );
}

function RootComponent() {
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to PowerSync backend
    const connectDb = async () => {
      try {
        await (powerSyncDatabase as any).connect();
        setConnectionError(null);
      } catch (err: any) {
        console.error("Failed to connect PowerSync:", err);
        setConnectionError(err?.message || "Failed to connect to sync service");
      }
    };
    connectDb();

    return () => {
      powerSyncDatabase.disconnect().catch(console.error);
    };
  }, []);

  return (
    <PowerSyncContext.Provider value={powerSyncDatabase}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-amber-50 relative overflow-hidden">
        {/* Twinkling stars background */}
        <div className="star star-1" />
        <div className="star star-2" />
        <div className="star star-3" />
        <div className="star star-4" />
        <div className="star star-5" />
        <div className="star star-6" />
        <div className="star star-7" />
        <div className="star star-8" />
        <div className="star star-9" />
        <div className="star star-10" />

        {connectionError && (
          <div className="relative z-20 bg-rose-900/80 border-b border-rose-500/50 px-6 py-2 text-sm text-rose-200 flex items-center gap-2">
            <span>⚠️</span>
            <span>Sync connection failed: {connectionError}. Working offline with local cache.</span>
          </div>
        )}
        <header className="border-b border-amber-200/10 px-6 py-4 bg-slate-900/50 backdrop-blur-md relative z-10">
          <nav className="mx-auto max-w-7xl flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight text-amber-100">
              🌴 SandSync
            </a>
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-200/60 hidden md:inline">
                Caribbean Folklore AI · PowerSync AI Hackathon 2026
              </span>
              <SyncStatusPill />
              <a
                href="/demo"
                className="text-[11px] text-amber-200/50 hover:text-amber-200/80 transition-colors px-2 py-1 rounded hover:bg-amber-500/10 font-mono"
              >
                🏗️ demo
              </a>
              <a
                href="/showcase"
                className="text-[11px] text-amber-200/50 hover:text-amber-200/80 transition-colors px-2 py-1 rounded hover:bg-amber-500/10 font-mono"
              >
                🌴 Showcase
              </a>
              <a
                href="/pipeline-demo"
                className="text-[11px] text-amber-200/50 hover:text-amber-200/80 transition-colors px-2 py-1 rounded hover:bg-amber-500/10 font-mono"
              >
                🔗 Pipeline
              </a>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8 relative z-10">
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
      {/* @ts-ignore - DEV is provided by Vite */}
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </PowerSyncContext.Provider>
  );
}
