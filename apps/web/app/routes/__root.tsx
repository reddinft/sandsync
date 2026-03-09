import { useEffect } from "react";
import {
  Outlet,
  ScrollRestoration,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { PowerSyncContext } from "@powersync/react";
import { powerSyncDatabase } from "../lib/powersync";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useEffect(() => {
    // Connect to PowerSync backend
    const connectDb = async () => {
      try {
        await (powerSyncDatabase as any).connect();
      } catch (err) {
        console.error("Failed to connect PowerSync:", err);
      }
    };
    connectDb();
    
    return () => {
      powerSyncDatabase.disconnect().catch(console.error);
    };
  }, []);

  return (
    <PowerSyncContext.Provider value={powerSyncDatabase}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-amber-100 relative overflow-hidden">
        {/* Firefly dots background — animated amber floaters */}
        <div className="firefly firefly-1" />
        <div className="firefly firefly-2" />
        <div className="firefly firefly-3" />
        <div className="firefly firefly-4" />
        <div className="firefly firefly-5" />
        <div className="firefly firefly-6" />
        <div className="firefly firefly-7" />
        <div className="firefly firefly-8" />
        <div className="firefly firefly-9" />
        <div className="firefly firefly-10" />

        {/* Header with glass effect */}
        <header className="border-b border-indigo-700/50 px-6 py-4 bg-slate-900/50 backdrop-blur-md relative z-10">
          <nav className="mx-auto max-w-6xl flex items-center justify-between">
            <a href="/" className="text-2xl font-bold tracking-tight text-amber-100 hover:text-amber-200 transition-colors">
              🌴 SandSync
            </a>
            <span className="text-xs text-amber-200/60">
              Caribbean Folklore AI · PowerSync Hackathon 2026
            </span>
          </nav>
        </header>

        {/* Main content area */}
        <main className="mx-auto max-w-6xl px-6 py-8 relative z-10">
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
      {/* @ts-ignore - DEV is provided by Vite */}
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </PowerSyncContext.Provider>
  );
}
