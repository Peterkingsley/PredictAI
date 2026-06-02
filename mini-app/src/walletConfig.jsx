import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { polygon } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { WagmiProvider } from "wagmi";

export const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, "");
export const requiredNetwork = polygon;

const METAMASK_WALLET_ID = "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96";
const TRUST_WALLET_ID = "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0";
const networks = [polygon];
const queryClient = new QueryClient();
const metadata = {
  name: "PredictAI",
  description: "Telegram-native Polymarket assistant",
  url: appUrl,
  icons: [`${appUrl}/vite.svg`],
  redirect: {
    universal: appUrl,
  },
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
    featuredWalletIds: [TRUST_WALLET_ID, METAMASK_WALLET_ID],
    allWallets: "ONLY_MOBILE",
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
