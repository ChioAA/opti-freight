'use client';

/**
 * Hook for interacting with the Returns Distribution program
 * Handles APY distribution and earnings for token holders
 */

import { useCallback, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAnchor } from '@/contexts/anchor-context';
import { Pool, ProgramAccount, TransactionResult } from '@/lib/anchor/types';
import BN from 'bn.js';

export function useReturnsDistribution() {
  const { client, isInitialized } = useAnchor();
  const [pools, setPools] = useState<ProgramAccount<Pool>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all distribution pools
   */
  const fetchPools = useCallback(async () => {
    if (!client || !isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      const program = client.returnsDistribution;
      if (!program) throw new Error('Returns Distribution program not initialized');

      // Fetch all Pool accounts
      const poolAccounts = await program.account.pool.all();

      setPools(poolAccounts as ProgramAccount<Pool>[]);
    } catch (err) {
      console.error('Error fetching pools:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [client, isInitialized]);

  /**
   * Initialize a new returns pool (admin only)
   */
  const initPool = useCallback(
    async (apy: number): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        const program = client.returnsDistribution;
        if (!program) {
          throw new Error('Returns Distribution program not initialized');
        }

        const provider = client.getProvider();

        // Derive PDA for pool account
        const [poolPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('pool')],
          program.programId
        );

        const tx = await program.methods
          .initPool(apy)
          .accounts({
            authority: provider.publicKey,
            pool: poolPda,
            systemProgram: PublicKey.default,
          })
          .rpc();

        console.log('Init pool transaction signature:', tx);

        // Refresh pools list
        await fetchPools();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error initializing pool:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized, fetchPools]
  );

  /**
   * Distribute returns to token holders
   */
  const distribute = useCallback(
    async (poolPublicKey: PublicKey, amount: BN): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        const program = client.returnsDistribution;
        if (!program) {
          throw new Error('Returns Distribution program not initialized');
        }

        const tx = await program.methods
          .distribute(amount)
          .accounts({
            pool: poolPublicKey,
          })
          .rpc();

        console.log('Distribute transaction signature:', tx);

        // Refresh pools after distribution
        await fetchPools();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error distributing returns:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized, fetchPools]
  );

  /**
   * Claim returns for a user
   */
  const claimReturns = useCallback(
    async (poolPublicKey: PublicKey): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        const program = client.returnsDistribution;
        if (!program) {
          throw new Error('Returns Distribution program not initialized');
        }

        const provider = client.getProvider();

        const tx = await program.methods
          .claim()
          .accounts({
            user: provider.publicKey,
            pool: poolPublicKey,
          })
          .rpc();

        console.log('Claim returns transaction signature:', tx);

        // Refresh pools after claiming
        await fetchPools();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error claiming returns:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized, fetchPools]
  );

  /**
   * Get a specific pool by public key
   */
  const getPool = useCallback(
    async (poolPublicKey: PublicKey): Promise<Pool | null> => {
      if (!client || !isInitialized) return null;

      try {
        const program = client.returnsDistribution;
        if (!program) return null;

        const poolAccount = await program.account.pool.fetch(poolPublicKey);
        return poolAccount as Pool;
      } catch (err) {
        console.error('Error fetching pool:', err);
        return null;
      }
    },
    [client, isInitialized]
  );

  /**
   * Calculate estimated returns for a user
   */
  const calculateEstimatedReturns = useCallback(
    (tokenAmount: number, apy: number, daysHeld: number): number => {
      // Simple APY calculation: (amount * apy * days) / 365
      const yearlyReturn = tokenAmount * (apy / 100);
      const dailyReturn = yearlyReturn / 365;
      return dailyReturn * daysHeld;
    },
    []
  );

  // Auto-fetch pools on mount
  useEffect(() => {
    if (isInitialized) {
      fetchPools();
    }
  }, [isInitialized, fetchPools]);

  return {
    pools,
    isLoading,
    error,
    fetchPools,
    initPool,
    distribute,
    claimReturns,
    getPool,
    calculateEstimatedReturns,
  };
}
