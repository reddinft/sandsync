"use client";

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
  return (
    <PowerSyncContext.Provider value={powerSyncDatabase}>
      <div className="min-h-screen bg-gradient-to-b from-amber-950 to-stone-900 text-amber-50">
        <header className="border-b border-amber-800/30 px-6 py-4">
          <nav className="mx-auto max-w-4xl flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight">
              🌴 SandSync
            </a>
            <span className="text-xs text-amber-400/60">
              Caribbean Folklore AI · PowerSync AI Hackathon 2026
            </span>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-8">
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </PowerSyncContext.Provider>
  );
}
