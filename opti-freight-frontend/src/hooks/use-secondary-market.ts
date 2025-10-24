'use client';

/**
 * Hook para interactuar con el mercado secundario de NFTs de OptiFreight
 * Maneja la reventa de NFTs entre usuarios (P2P)
 * El NFT se guarda en escrow hasta que se venda o cancele
 */

import { useCallback, useEffect, useState } from 'react';
import { PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import secondaryMarketIdl from '@/lib/anchor/idl/secondary_market.json';
import type { Idl } from '@coral-xyz/anchor';

// Tipos para window.solana (Phantom wallet)
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isConnected?: boolean;
      publicKey?: PublicKey;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      off: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

const PLATFORM_WALLET = new PublicKey('468zRBWHvREsy67no7yVviW69i173dZt25XKsDqKeCNh');
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com";

export interface Listing {
  seller: PublicKey;
  nftMint: PublicKey;
  price: BN;
  purchaseDate: BN;
  listedAt: BN;
  active: boolean;
  bump: number;
}

export interface ListingWithKey {
  publicKey: PublicKey;
  account: Listing;
}

interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export function useSecondaryMarket() {
  const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com";
  const connection = new Connection(SOLANA_RPC, 'confirmed');

  const [listings, setListings] = useState<ListingWithKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtiene todos los listings activos del mercado secundario
   */
  const fetchListings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📊 Cargando listings del mercado de reventa...');

      // Crear conexión directa (NO necesita wallet para LEER datos públicos)
      const directConnection = new Connection(SOLANA_RPC, 'confirmed');

      // Wallet dummy solo para inicializar el provider (Anchor lo requiere pero no lo usa para leer)
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async () => { throw new Error('Not implemented'); },
        signAllTransactions: async () => { throw new Error('Not implemented'); },
      };

      const provider = new AnchorProvider(directConnection, dummyWallet as any, {
        commitment: 'confirmed',
      });

      const program = new Program(secondaryMarketIdl as Idl, provider);

      // Obtener todas las cuentas Listing usando el discriminador
      const programId = new PublicKey(secondaryMarketIdl.address);

      // Discriminador para la cuenta Listing (del IDL): [218, 32, 50, 73, 43, 134, 26, 58]
      const listingDiscriminator = Buffer.from([218, 32, 50, 73, 43, 134, 26, 58]);

      const accounts = await directConnection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(listingDiscriminator),
            },
          },
        ],
      });

      console.log('📊 Total de cuentas Listing encontradas:', accounts.length);

      // Decodificar y filtrar solo listings activos
      const activeListings: ListingWithKey[] = [];

      for (const { pubkey, account } of accounts) {
        try {
          // Decodificar manualmente los datos de la cuenta (sin usar coder de Anchor)
          // Estructura del Listing según el IDL:
          // 8 bytes discriminador + seller(32) + nftMint(32) + price(8) + purchaseDate(8) + listedAt(8) + active(1) + bump(1)

          const data = account.data;
          let offset = 8; // Saltar discriminador

          // Leer seller (32 bytes)
          const seller = new PublicKey(data.slice(offset, offset + 32));
          offset += 32;

          // Leer nftMint (32 bytes)
          const nftMint = new PublicKey(data.slice(offset, offset + 32));
          offset += 32;

          // Leer price (8 bytes, u64 little-endian)
          const price = new BN(data.slice(offset, offset + 8), 'le');
          offset += 8;

          // Leer purchaseDate (8 bytes, i64 little-endian)
          const purchaseDate = new BN(data.slice(offset, offset + 8), 'le');
          offset += 8;

          // Leer listedAt (8 bytes, i64 little-endian)
          const listedAt = new BN(data.slice(offset, offset + 8), 'le');
          offset += 8;

          // Leer active (1 byte, bool)
          const active = data[offset] === 1;
          offset += 1;

          // Leer bump (1 byte, u8)
          const bump = data[offset];

          console.log('📋 Listing encontrado:', {
            publicKey: pubkey.toString(),
            seller: seller.toString(),
            nftMint: nftMint.toString(),
            price: price.toString(),
            active,
          });

          if (active) {
            activeListings.push({
              publicKey: pubkey,
              account: {
                seller,
                nftMint,
                price,
                purchaseDate,
                listedAt,
                active,
                bump,
              },
            });
          }
        } catch (decodeErr) {
          // Ignorar cuentas que no se pueden decodificar
          console.error('⚠️ Error decodificando cuenta:', pubkey.toString(), decodeErr);
        }
      }

      console.log('📊 Listings activos encontrados:', activeListings.length);
      setListings(activeListings);
    } catch (err) {
      console.error('❌ Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Crea un nuevo listing para vender un NFT
   * El NFT se transfiere a un escrow hasta que se venda o cancele
   */
  const createListing = useCallback(
    async (
      nftMint: PublicKey,
      priceInSOL: number,
      purchaseDate: Date,
      userPublicKey: PublicKey
    ): Promise<TransactionResult> => {
      // Verificar que window.solana esté disponible y conectada
      if (typeof window === 'undefined' || !window.solana || !userPublicKey) {
        return { success: false, error: 'Wallet no conectada' };
      }

      try {
        console.log('📝 Creando listing de NFT...');

        // Crear wrapper de wallet para Anchor usando window.solana
        const wallet = {
          publicKey: userPublicKey,
          signTransaction: window.solana.signTransaction.bind(window.solana),
          signAllTransactions: window.solana.signAllTransactions.bind(window.solana),
        };

        const provider = new AnchorProvider(connection, wallet as any, {
          commitment: 'confirmed',
        });

        const program = new Program(secondaryMarketIdl as Idl, provider);

        // Convertir precio a lamports
        const priceInLamports = new BN(priceInSOL * 1e9);

        // Convertir fecha a unix timestamp
        const purchaseDateUnix = new BN(Math.floor(purchaseDate.getTime() / 1000));

        // Derivar PDA del listing
        const [listingPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('listing'), wallet.publicKey.toBuffer(), nftMint.toBuffer()],
          program.programId
        );

        // Token account del vendedor
        const sellerTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          wallet.publicKey
        );

        // Token account del escrow
        const escrowTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          listingPDA,
          true
        );

        console.log('📍 Listing PDA:', listingPDA.toString());
        console.log('💰 Precio:', priceInSOL, 'SOL');

        const tx = await program.methods
          .list(priceInLamports, purchaseDateUnix)
          .accounts({
            seller: wallet.publicKey,
            nftMint: nftMint,
            sellerTokenAccount: sellerTokenAccount,
            listing: listingPDA,
            escrowTokenAccount: escrowTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log('✅ Listing creado! Signature:', tx);

        // Refrescar listings
        await fetchListings();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error creating listing:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [connection, fetchListings]
  );

  /**
   * Compra un NFT de un listing
   * Transferencia atómica: SOL al vendedor (menos fees), NFT al comprador
   */
  const buyFromListing = useCallback(
    async (listingPublicKey: PublicKey, userPublicKey: PublicKey): Promise<TransactionResult> => {
      // Verificar que window.solana esté disponible y conectada
      if (typeof window === 'undefined' || !window.solana || !userPublicKey) {
        return { success: false, error: 'Wallet no conectada' };
      }

      try {
        console.log('💰 Comprando NFT del listing...');

        // Crear wrapper de wallet para Anchor usando window.solana
        const wallet = {
          publicKey: userPublicKey,
          signTransaction: window.solana.signTransaction.bind(window.solana),
          signAllTransactions: window.solana.signAllTransactions.bind(window.solana),
        };

        const provider = new AnchorProvider(connection, wallet as any, {
          commitment: 'confirmed',
        });

        const program = new Program(secondaryMarketIdl as Idl, provider);

        // Obtener datos del listing - decodificar manualmente
        const accountInfo = await connection.getAccountInfo(listingPublicKey);
        if (!accountInfo) {
          throw new Error('Listing no encontrado');
        }

        // Decodificar manualmente igual que en fetchListings
        const data = accountInfo.data;
        let offset = 8; // Saltar discriminador
        const seller = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const nftMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const price = new BN(data.slice(offset, offset + 8), 'le');

        const listing = { seller, nftMint, price };

        console.log('📦 NFT Mint:', listing.nftMint.toString());
        console.log('💰 Precio:', listing.price.toString(), 'lamports');

        // Token account del escrow
        const escrowTokenAccount = await getAssociatedTokenAddress(
          listing.nftMint,
          listingPublicKey,
          true
        );

        // Token account del comprador
        const buyerTokenAccount = await getAssociatedTokenAddress(
          listing.nftMint,
          wallet.publicKey
        );

        const tx = await program.methods
          .buy()
          .accounts({
            buyer: wallet.publicKey,
            seller: listing.seller,
            listing: listingPublicKey,
            nftMint: listing.nftMint,
            escrowTokenAccount: escrowTokenAccount,
            buyerTokenAccount: buyerTokenAccount,
            platformWallet: PLATFORM_WALLET,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log('✅ NFT comprado! Signature:', tx);

        // Refrescar listings
        await fetchListings();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error buying from listing:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [connection, fetchListings]
  );

  /**
   * Cancela un listing y devuelve el NFT al vendedor desde el escrow
   */
  const cancelListing = useCallback(
    async (listingPublicKey: PublicKey, nftMint: PublicKey, userPublicKey: PublicKey): Promise<TransactionResult> => {
      // Verificar que window.solana esté disponible y conectada
      if (typeof window === 'undefined' || !window.solana || !userPublicKey) {
        return { success: false, error: 'Wallet no conectada' };
      }

      try {
        console.log('❌ Cancelando listing...');

        // Crear wrapper de wallet para Anchor usando window.solana
        const wallet = {
          publicKey: userPublicKey,
          signTransaction: window.solana.signTransaction.bind(window.solana),
          signAllTransactions: window.solana.signAllTransactions.bind(window.solana),
        };

        const provider = new AnchorProvider(connection, wallet as any, {
          commitment: 'confirmed',
        });

        const program = new Program(secondaryMarketIdl as Idl, provider);

        // Token account del escrow
        const escrowTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          listingPublicKey,
          true
        );

        // Token account del vendedor (a donde regresa el NFT)
        const sellerTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          wallet.publicKey
        );

        const tx = await program.methods
          .cancel()
          .accounts({
            seller: wallet.publicKey,
            listing: listingPublicKey,
            nftMint: nftMint,
            escrowTokenAccount: escrowTokenAccount,
            sellerTokenAccount: sellerTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        console.log('✅ Listing cancelado! Signature:', tx);

        // Refrescar listings
        await fetchListings();

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error canceling listing:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [connection, fetchListings]
  );

  /**
   * Obtiene un listing específico por su public key
   */
  const getListing = useCallback(
    async (nftMintOrListingPubkey: PublicKey): Promise<Listing | null> => {
      try {
        // Verificar que window.solana esté disponible
        if (typeof window === 'undefined' || !window.solana || !window.solana.publicKey) {
          return null;
        }

        const programId = new PublicKey(secondaryMarketIdl.address);

        // Intentar derivar el PDA del listing usando el NFT mint + seller
        const [listingPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('listing'), window.solana.publicKey.toBuffer(), nftMintOrListingPubkey.toBuffer()],
          programId
        );

        const accountInfo = await connection.getAccountInfo(listingPDA);
        if (!accountInfo) {
          return null;
        }

        // Decodificar manualmente
        const data = accountInfo.data;
        let offset = 8;
        const seller = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const nftMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        const price = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;
        const purchaseDate = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;
        const listedAt = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;
        const active = data[offset] === 1;
        offset += 1;
        const bump = data[offset];

        const listing = { seller, nftMint, price, purchaseDate, listedAt, active, bump };

        // Solo retornar si está activo
        if (listing.active) {
          return listing as Listing;
        }
        return null;
      } catch (err) {
        // No existe el listing o no está activo
        return null;
      }
    },
    [connection]
  );

  // Auto-fetch listings on mount (NO requiere wallet para leer datos públicos)
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

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
