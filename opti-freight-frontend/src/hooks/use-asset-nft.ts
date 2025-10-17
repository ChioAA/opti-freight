'use client';

/**
 * Hook for interacting with the Asset NFT program
 * Handles creation and management of tokenized trailer assets
 */

import { useCallback, useEffect, useState } from 'react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAnchor } from '@/contexts/anchor-context';
import { TrailerAsset, ProgramAccount, TransactionResult } from '@/lib/anchor/types';
import BN from 'bn.js';

export interface CreateTrailerNFTParams {
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  series: string;
  totalValue: BN;
  tokenPrice: BN;
  totalTokens: number;
  apy: number;
  termYears: number;
}

export function useAssetNFT() {
  const { client, isInitialized } = useAnchor();
  const [trailerAssets, setTrailerAssets] = useState<ProgramAccount<TrailerAsset>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all trailer assets
   * Note: This will work once asset_nft program is deployed and has an IDL
   */
  const fetchTrailerAssets = useCallback(async () => {
    if (!client || !isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      // TODO: Implement once asset_nft program is initialized in client
      // const program = client.assetNFT;
      // if (!program) throw new Error('Asset NFT program not initialized');

      // const assetAccounts = await program.account.trailerAsset.all();
      // setTrailerAssets(assetAccounts as ProgramAccount<TrailerAsset>[]);

      console.warn('Asset NFT program not yet integrated');
      setTrailerAssets([]);
    } catch (err) {
      console.error('Error fetching trailer assets:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [client, isInitialized]);

  /**
   * Create a new trailer NFT
   */
  const createTrailerNFT = useCallback(
    async (params: CreateTrailerNFTParams): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        // TODO: Implement once asset_nft program is initialized in client
        // const program = client.assetNFT;
        // if (!program) {
        //   throw new Error('Asset NFT program not initialized');
        // }

        // const provider = client.getProvider();

        // // Derive PDA for trailer asset account
        // const [trailerAssetPda] = PublicKey.findProgramAddressSync(
        //   [Buffer.from('trailer'), params.mint.toBuffer()],
        //   program.programId
        // );

        // const tx = await program.methods
        //   .createTrailerNft(
        //     params.name,
        //     params.symbol,
        //     params.uri,
        //     params.series,
        //     params.totalValue,
        //     params.tokenPrice,
        //     params.totalTokens,
        //     params.apy,
        //     params.termYears
        //   )
        //   .accounts({
        //     authority: provider.publicKey,
        //     trailerAsset: trailerAssetPda,
        //     mint: params.mint,
        //     tokenProgram: TOKEN_PROGRAM_ID,
        //     systemProgram: SystemProgram.programId,
        //     rent: SYSVAR_RENT_PUBKEY,
        //   })
        //   .rpc();

        // console.log('Create trailer NFT transaction signature:', tx);

        // // Refresh assets after creation
        // await fetchTrailerAssets();

        // return { signature: tx, success: true };

        return {
          signature: '',
          success: false,
          error: 'Asset NFT program not yet integrated - IDL needed',
        };
      } catch (err) {
        console.error('Error creating trailer NFT:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized, fetchTrailerAssets]
  );

  /**
   * Update metadata for a trailer asset
   */
  const updateMetadata = useCallback(
    async (trailerAssetPubkey: PublicKey, newUri: string): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        // TODO: Implement once asset_nft program is initialized
        return {
          signature: '',
          success: false,
          error: 'Asset NFT program not yet integrated - IDL needed',
        };
      } catch (err) {
        console.error('Error updating metadata:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized]
  );

  /**
   * Set lock status for a trailer asset
   */
  const setLockStatus = useCallback(
    async (trailerAssetPubkey: PublicKey, isLocked: boolean): Promise<TransactionResult> => {
      if (!client || !isInitialized) {
        return { signature: '', success: false, error: 'Client not initialized' };
      }

      try {
        // TODO: Implement once asset_nft program is initialized
        return {
          signature: '',
          success: false,
          error: 'Asset NFT program not yet integrated - IDL needed',
        };
      } catch (err) {
        console.error('Error setting lock status:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [client, isInitialized]
  );

  /**
   * Get a specific trailer asset by public key
   */
  const getTrailerAsset = useCallback(
    async (assetPubkey: PublicKey): Promise<TrailerAsset | null> => {
      if (!client || !isInitialized) return null;

      try {
        // TODO: Implement once asset_nft program is initialized
        console.warn('Asset NFT program not yet integrated');
        return null;
      } catch (err) {
        console.error('Error fetching trailer asset:', err);
        return null;
      }
    },
    [client, isInitialized]
  );

  /**
   * Calculate percentage of tokens sold
   */
  const calculateTokensSoldPercentage = useCallback((asset: TrailerAsset): number => {
    if (asset.totalTokens === 0) return 0;
    return (asset.tokensSold / asset.totalTokens) * 100;
  }, []);

  /**
   * Check if asset is expired
   */
  const isAssetExpired = useCallback((asset: TrailerAsset): boolean => {
    const now = Math.floor(Date.now() / 1000);
    return now > Number(asset.expiryAt);
  }, []);

  /**
   * Calculate time until expiry
   */
  const getTimeUntilExpiry = useCallback((asset: TrailerAsset): number => {
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = Number(asset.expiryAt);
    return Math.max(0, expiryTime - now);
  }, []);

  // Auto-fetch assets on mount
  useEffect(() => {
    if (isInitialized) {
      fetchTrailerAssets();
    }
  }, [isInitialized, fetchTrailerAssets]);

  return {
    trailerAssets,
    isLoading,
    error,
    fetchTrailerAssets,
    createTrailerNFT,
    updateMetadata,
    setLockStatus,
    getTrailerAsset,
    calculateTokensSoldPercentage,
    isAssetExpired,
    getTimeUntilExpiry,
  };
}
