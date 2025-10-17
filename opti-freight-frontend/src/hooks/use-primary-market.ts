'use client';

/**
 * Hook for interacting with the Primary Market program
 * Handles buying tokens from initial sale offerings
 */

import { useCallback, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAnchor } from '@/contexts/anchor-context';
import { Sale, ProgramAccount, TransactionResult } from '@/lib/anchor/types';
import BN from 'bn.js';

export function usePrimaryMarket() {
  const { client, isInitialized } = useAnchor();
  const [sales, setSales] = useState<ProgramAccount<Sale>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all active sales from the Primary Market
   */
  const fetchSales = useCallback(async () => {
    if (!client || !isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      const program = client.primaryMarket;
      if (!program) throw new Error('Primary Market program not initialized');

      // Fetch all Sale accounts
      const salesAccounts = await program.account.sale.all();

      // Filter only active sales
      const activeSales = salesAccounts.filter((sale: any) => sale.account.active);

      setSales(activeSales as ProgramAccount<Sale>[]);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [client, isInitialized]);

  /**
   * Buy tokens from a specific sale
   */
  const buyTokens = useCallback(
    async (salePublicKey: PublicKey, amount: number): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        const program = client.primaryMarket;
        if (!program) {
          throw new Error('Primary Market program not initialized');
        }

        // Execute buy instruction
        const tx = await program.methods
          .buy(amount)
          .accounts({
            sale: salePublicKey,
          })
          .rpc();

        console.log('Buy transaction signature:', tx);

        // Refresh sales list after purchase
        await fetchSales();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error buying tokens:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized, fetchSales]
  );

  /**
   * Get a specific sale by public key
   */
  const getSale = useCallback(
    async (salePublicKey: PublicKey): Promise<Sale | null> => {
      if (!client || !isInitialized) return null;

      try {
        const program = client.primaryMarket;
        if (!program) return null;

        const saleAccount = await program.account.sale.fetch(salePublicKey);
        return saleAccount as Sale;
      } catch (err) {
        console.error('Error fetching sale:', err);
        return null;
      }
    },
    [client, isInitialized]
  );

  /**
   * Initialize a new sale (admin only)
   */
  const initSale = useCallback(
    async (price: BN, total: number): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        const program = client.primaryMarket;
        if (!program) {
          throw new Error('Primary Market program not initialized');
        }

        const provider = client.getProvider();

        // Derive PDA for sale account
        const [salePda] = PublicKey.findProgramAddressSync(
          [Buffer.from('sale')],
          program.programId
        );

        const tx = await program.methods
          .initSale(price, total)
          .accounts({
            authority: provider.publicKey,
            sale: salePda,
            systemProgram: PublicKey.default,
          })
          .rpc();

        console.log('Init sale transaction signature:', tx);

        // Refresh sales list
        await fetchSales();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error initializing sale:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized, fetchSales]
  );

  // Auto-fetch sales on mount
  useEffect(() => {
    if (isInitialized) {
      fetchSales();
    }
  }, [isInitialized, fetchSales]);

  return {
    sales,
    isLoading,
    error,
    fetchSales,
    buyTokens,
    getSale,
    initSale,
  };
}
