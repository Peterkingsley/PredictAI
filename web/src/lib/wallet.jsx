import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { polygon } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { WagmiProvider } from "wagmi";

export const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";
export const requiredNetwork = polygon;

const networks = [polygon];
const queryClient = new QueryClient();
const appUrl = (import.meta.env.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
const metadata = {
  name: "PredictAI",
  description: "Create and predict everything",
  url: appUrl,
  icons: [`${appUrl}/favicon.svg`],
  redirect: { universal: appUrl },
};

let wagmiAdapter = null;

if (walletConnectProjectId) {
  wagmiAdapter = new WagmiAdapter({ networks, projectId: walletConnectProjectId, ssr: false });
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId: walletConnectProjectId,
    metadata,
    allWallets: "SHOW",
    features: { analytics: false, email: false, socials: [] },
  });
}

export function WalletProvider({ children }) {
  if (!wagmiAdapter) {
    return children;
  }
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
