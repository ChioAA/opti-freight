"use client";

import React, { useMemo, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import default styles for wallet modal
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: ReactNode;
}

export function SolanaWalletProvider({ children }: SolanaWalletProviderProps) {
  // Limpiar TODA la caché de wallets al cargar - NUNCA guardar wallets
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Eliminar TODAS las keys relacionadas con wallets de Solana
      Object.keys(localStorage).forEach(key => {
        if (key.includes('wallet') || key.includes('solana') || key.includes('phantom')) {
          console.log('🧹 Limpiando caché de wallet:', key);
          localStorage.removeItem(key);
        }
      });
    }
  }, []);

  // Choose the network (devnet for development, mainnet-beta for production)
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => {
    // For production, use your own RPC endpoint from Helius, QuickNode, etc.
    // Example: return 'https://your-custom-rpc-endpoint.com';
    return clusterApiUrl(network);
  }, [network]);

  // Array vacío - detecta Standard Wallets automáticamente (como Phantom)
  // NO usar adapters explícitos porque Phantom se registra como Standard Wallet
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
