'use client';

/**
 * Anchor Context Provider
 * Provides Anchor client and program instances throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { AnchorClient, createAnchorClient } from '@/lib/anchor/anchor-client';

interface AnchorContextType {
  client: AnchorClient | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

const AnchorContext = createContext<AnchorContextType>({
  client: null,
  isInitialized: false,
  isLoading: true,
  error: null,
});

export function AnchorProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const [client, setClient] = useState<AnchorClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initClient() {
      try {
        setIsLoading(true);
        setError(null);

        const anchorClient = await createAnchorClient({
          wallet,
          network: 'devnet',
        });

        setClient(anchorClient);
        setIsInitialized(anchorClient.isInitialized());
      } catch (err) {
        console.error('Failed to initialize Anchor client:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    if (wallet.publicKey) {
      initClient();
    } else {
      setClient(null);
      setIsInitialized(false);
      setIsLoading(false);
    }
  }, [wallet.publicKey, wallet.connected]);

  return (
    <AnchorContext.Provider
      value={{
        client,
        isInitialized,
        isLoading,
        error,
      }}
    >
      {children}
    </AnchorContext.Provider>
  );
}

/**
 * Hook to access the Anchor context
 */
export function useAnchor() {
  const context = useContext(AnchorContext);
  if (!context) {
    throw new Error('useAnchor must be used within an AnchorProvider');
  }
  return context;
}
