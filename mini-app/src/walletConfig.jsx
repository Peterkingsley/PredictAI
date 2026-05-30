import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { polygon } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { WagmiProvider } from "wagmi";

export const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const requiredNetwork = polygon;

const networks = [polygon];
const queryClient = new QueryClient();
const metadata = {
  name: "PredictAI",
  description: "Telegram-native Polymarket assistant",
  url: window.location.origin,
  icons: [`${window.location.origin}/vite.svg`],
};

let wagmiAdapter = null;

if (walletConnectProjectId) {
  wagmiAdapter = new WagmiAdapter({
    networks,
    projectId: walletConnectProjectId,
    ssr: false,
  });

  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId: walletConnectProjectId,
    metadata,
    features: {
      analytics: false,
      email: false,
      socials: [],
    },
  });
}

export function AppKitProvider({ children }) {
  if (!wagmiAdapter) {
    return children;
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
