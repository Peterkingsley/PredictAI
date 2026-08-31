import type { Network } from '../screens/WalletSettingsScreen';

export type ScannedWalletAddress = { address: string; network?: Network };

const networksByChainId: Record<string, Network> = {
  '1': 'Ethereum',
  '137': 'Polygon',
  '42161': 'Arbitrum',
  '8453': 'Base',
};

export function parseWalletQr(value: string): ScannedWalletAddress | null {
  let decoded = value.trim();
  try { decoded = decodeURIComponent(decoded); } catch { /* Use the original QR value. */ }
  const isPlainAddress = /^0x[a-fA-F0-9]{40}$/.test(decoded);
  const isEthereumUri = /^ethereum:/i.test(decoded);
  if (!isPlainAddress && !isEthereumUri) return null;
  const address = decoded.match(/0x[a-fA-F0-9]{40}/)?.[0];
  if (!address) return null;
  const chainId = decoded.match(/@(\d+)/)?.[1];
  if (chainId && !networksByChainId[chainId]) return null;
  return { address, network: chainId ? networksByChainId[chainId] : undefined };
}
