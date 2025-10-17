'use client';

/**
 * Hook for interacting with the Secondary Market program
 * Handles P2P trading of tokenized assets
 */

import { useCallback, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAnchor } from '@/contexts/anchor-context';
import { Listing, ProgramAccount, TransactionResult } from '@/lib/anchor/types';
import BN from 'bn.js';

export function useSecondaryMarket() {
  const { client, isInitialized } = useAnchor();
  const [listings, setListings] = useState<ProgramAccount<Listing>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all active listings from the Secondary Market
   */
  const fetchListings = useCallback(async () => {
    if (!client || !isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      const program = client.secondaryMarket;
      if (!program) throw new Error('Secondary Market program not initialized');

      // Fetch all Listing accounts
      const listingAccounts = await program.account.listing.all();

      // Filter only active listings
      const activeListings = listingAccounts.filter((listing: any) => listing.account.active);

      setListings(activeListings as ProgramAccount<Listing>[]);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [client, isInitialized]);

  /**
   * Create a new listing to sell tokens
   */
  const createListing = useCallback(
    async (price: BN, amount: number): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        const program = client.secondaryMarket;
        if (!program) {
          throw new Error('Secondary Market program not initialized');
        }

        const provider = client.getProvider();

        // Derive PDA for listing account
        const [listingPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('listing'), provider.publicKey!.toBuffer()],
          program.programId
        );

        const tx = await program.methods
          .list(price, amount)
          .accounts({
            seller: provider.publicKey,
            listing: listingPda,
            systemProgram: PublicKey.default,
          })
          .rpc();

        console.log('Create listing transaction signature:', tx);

        // Refresh listings after creation
        await fetchListings();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error creating listing:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized, fetchListings]
  );

  /**
   * Buy tokens from a listing
   */
  const buyFromListing = useCallback(
    async (listingPublicKey: PublicKey): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        const program = client.secondaryMarket;
        if (!program) {
          throw new Error('Secondary Market program not initialized');
        }

        // Execute buy instruction
        const tx = await program.methods
          .buy()
          .accounts({
            listing: listingPublicKey,
          })
          .rpc();

        console.log('Buy from listing transaction signature:', tx);

        // Refresh listings after purchase
        await fetchListings();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error buying from listing:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized, fetchListings]
  );

  /**
   * Cancel an existing listing
   */
  const cancelListing = useCallback(
    async (listingPublicKey: PublicKey): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        const program = client.secondaryMarket;
        if (!program) {
          throw new Error('Secondary Market program not initialized');
        }

        const provider = client.getProvider();

        const tx = await program.methods
          .cancel()
          .accounts({
            seller: provider.publicKey,
            listing: listingPublicKey,
          })
          .rpc();

        console.log('Cancel listing transaction signature:', tx);

        // Refresh listings after cancellation
        await fetchListings();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error cancelling listing:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized, fetchListings]
  );

  /**
   * Get a specific listing by public key
   */
  const getListing = useCallback(
    async (listingPublicKey: PublicKey): Promise<Listing | null> => {
      if (!client || !isInitialized) return null;

      try {
        const program = client.secondaryMarket;
        if (!program) return null;

        const listingAccount = await program.account.listing.fetch(listingPublicKey);
        return listingAccount as Listing;
      } catch (err) {
        console.error('Error fetching listing:', err);
        return null;
      }
    },
    [client, isInitialized]
  );

  // Auto-fetch listings on mount
  useEffect(() => {
    if (isInitialized) {
      fetchListings();
    }
  }, [isInitialized, fetchListings]);

  return {
    listings,
    isLoading,
    error,
    fetchListings,
    createListing,
    buyFromListing,
    cancelListing,
    getListing,
  };
}
