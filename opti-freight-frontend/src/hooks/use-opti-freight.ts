'use client';

/**
 * Hook Unificado para el Programa Opti-Freight
 * Se conecta al programa unificado desplegado de opti-freight en Devnet
 * Maneja Mercado Primario, Mercado Secundario y Distribucion de Retornos
 * PAGOS EN SOL NATIVO - SIN USDC
 */

import { useCallback, useEffect, useState } from 'react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import optiFreightIdl from '@/lib/idl/opti_freight.json';

// Constantes del Programa (SOL)
const PROGRAM_ID = new PublicKey('7x4rNdNN9Szce8qfasDGiV3srApWcJ339t8iGAyKjrga');
const PLATFORM_WALLET = new PublicKey('468zRBWHvREsy67no7yVviW69i173dZt25XKsDqKeCNh');

// Debug: Verificar IDL
console.log('🔍 IDL loaded - Program address:', (optiFreightIdl as any).address);
console.log('🔍 PROGRAM_ID constant:', PROGRAM_ID.toString());

// Constantes de Logica de Negocio (en SOL)
const TOKENS_PER_TRAILER = 1000;
const TOKEN_PRICE_SOL = 0.12; // PARA PRUEBAS // 1.2 SOL por token
const PRIMARY_FEE_BPS = 300; // 3%
const MIN_RESALE_PRICE_SOL = 0.145; // PARA PRUEBAS // 1.45 SOL minimo
const PENALTY_SOL = 0.025; // PARA PRUEBAS // 0.25 SOL penalizacion
const SECONDARY_FEE_BPS = 300; // 3%
const DISTRIBUTION_DAY = 20;

// Tipos
interface Sale {
  authority: PublicKey;
  total: number;
  sold: number;
  active: boolean;
  bump: number;
}

interface Listing {
  seller: PublicKey;
  price: BN;
  amount: number;
  active: boolean;
  bump: number;
}

interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

interface ProgramAccount<T> {
  publicKey: PublicKey;
  account: T;
}

export function useOptiFreight() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sales, setSales] = useState<ProgramAccount<Sale>[]>([]);
  const [listings, setListings] = useState<ProgramAccount<Listing>[]>([]);

  // Inicializar programa cuando la wallet se conecta
  useEffect(() => {
    if (wallet.publicKey && wallet.signTransaction) {
      try {
        const provider = new AnchorProvider(
          connection,
          wallet as any,
          { commitment: 'confirmed' }
        );

        const programInstance = new Program(optiFreightIdl as any, provider);
        setProgram(programInstance);
        console.log('✅ Programa opti_freight inicializado correctamente');
      } catch (err) {
        console.error('Failed to initialize program:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } else {
      console.log('⏳ Esperando conexión de wallet para inicializar programa...');
    }
  }, [wallet.publicKey, wallet.signTransaction, connection]);

  /**
   * MERCADO PRIMARIO: Inicializar una nueva venta (Solo Admin)
   */
  const initSale = useCallback(async (): Promise<TransactionResult> => {
    if (!program || !wallet.publicKey) {
      return {
        signature: '',
        success: false,
        error: 'Wallet not connected or program not initialized'
      };
    }

    try {
      setIsLoading(true);
      setError(null);

      const [salePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('sale'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const tx = await program.methods
        .initSale()
        .accounts({
          authority: wallet.publicKey,
          sale: salePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Sale initialized. Transaction:', tx);

      return { signature: tx, success: true };
    } catch (err) {
      console.error('Error initializing sale:', err);
      return {
        signature: '',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    } finally {
      setIsLoading(false);
    }
  }, [program, wallet.publicKey]);

  /**
   * MERCADO PRIMARIO: Comprar tokens con SOL
   */
  const buyPrimary = useCallback(
    async (salePublicKey: PublicKey, amount: number, userPublicKey: PublicKey): Promise<TransactionResult> => {
      // Verificar que window.solana esté disponible
      if (typeof window === 'undefined' || !window.solana || !userPublicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      // Crear programa on-demand para esta transacción
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com", 'confirmed');
      const wallet = {
        publicKey: userPublicKey,
        signTransaction: window.solana.signTransaction.bind(window.solana),
        signAllTransactions: window.solana.signAllTransactions.bind(window.solana),
      };
      const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program = new Program(optiFreightIdl as any, provider);

      const baseCost = TOKEN_PRICE_SOL * amount;
      const fee = (baseCost * PRIMARY_FEE_BPS) / 10000;
      const totalCost = baseCost + fee;

      console.log(`💰 Procesando pago SOL...`);
      console.log(`Precio base: ${baseCost} SOL`);
      console.log(`Comisión (3%): ${fee} SOL`);
      console.log(`Total: ${totalCost} SOL`);

      try {
        setIsLoading(true);
        setError(null);

        // Usar la TREASURY_AUTHORITY directamente como seller
        // No necesitamos hacer fetch de la cuenta Sale porque sabemos quién es el authority
        const TREASURY_AUTHORITY = new PublicKey('H6XLCy6UcVa7rse3EYLcsCFdyxdX6FRGKtLAPtmgMZb5');

        console.log(`👤 Comprador: ${userPublicKey.toString()}`);
        console.log(`👤 Vendedor (Treasury): ${TREASURY_AUTHORITY.toString()}`);
        console.log(`🏢 Plataforma: ${PLATFORM_WALLET.toString()}`);
        console.log(`📍 Sale PDA: ${salePublicKey.toString()}`);

        let tx;
        try {
          tx = await program.methods
            .buyPrimary(amount)
            .accounts({
              buyer: userPublicKey,
              sale: salePublicKey,
              seller: TREASURY_AUTHORITY,
              platform: PLATFORM_WALLET,
              systemProgram: SystemProgram.programId,
            })
            .rpc();

          console.log(`✅ Comprados ${amount} tokens por ${totalCost} SOL. Tx:`, tx);
        } catch (rpcError: any) {
          // Si el error es "transaction already processed", significa que SÍ se procesó
          if (rpcError.message?.includes('already been processed') ||
              rpcError.transactionMessage?.includes('already been processed')) {
            console.log(`⚠️ Transaction already processed (pero la compra SÍ se completó)`);
            tx = 'already_processed_success';
          } else {
            throw rpcError;
          }
        }

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error buying from primary market:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [program, wallet.publicKey, connection]
  );

  /**
   * MERCADO SECUNDARIO: Crear un listado para revender tokens
   */
  const createListing = useCallback(
    async (price: number, amount: number): Promise<TransactionResult> => {
      if (!program || !wallet.publicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      if (price < MIN_RESALE_PRICE_SOL) {
        return {
          signature: '',
          success: false,
          error: `Minimum resale price is ${MIN_RESALE_PRICE_SOL} SOL`,
        };
      }

      try {
        setIsLoading(true);
        setError(null);

        const [listingPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('listing'), wallet.publicKey.toBuffer()],
          PROGRAM_ID
        );

        const priceInLamports = new BN(price * LAMPORTS_PER_SOL);

        const tx = await program.methods
          .createListing(priceInLamports, amount)
          .accounts({
            seller: wallet.publicKey,
            listing: listingPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log(`Listed ${amount} tokens at ${price} SOL. Tx:`, tx);

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error creating listing:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [program, wallet.publicKey]
  );

  /**
   * MERCADO SECUNDARIO: Comprar de un listado con SOL
   */
  const buySecondary = useCallback(
    async (listingPublicKey: PublicKey, amount: number): Promise<TransactionResult> => {
      if (!program || !wallet.publicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      try {
        setIsLoading(true);
        setError(null);

        const listing = await program.account.listing.fetch(listingPublicKey);

        const pricePerToken = listing.price.toNumber() / LAMPORTS_PER_SOL;
        const subtotal = pricePerToken * amount;
        const fee = (subtotal * SECONDARY_FEE_BPS) / 10000;
        const penalty = PENALTY_SOL * amount;
        const totalBuyerPays = subtotal + fee;
        const sellerReceives = subtotal - penalty;
        const platformReceives = penalty + fee;

        console.log('Secondary market purchase breakdown:', {
          subtotal: `${subtotal} SOL`,
          fee: `${fee} SOL`,
          penalty: `${penalty} SOL`,
          totalBuyerPays: `${totalBuyerPays} SOL`,
          sellerReceives: `${sellerReceives} SOL`,
          platformReceives: `${platformReceives} SOL`,
        });

        const tx = await program.methods
          .buySecondary(amount)
          .accounts({
            buyer: wallet.publicKey,
            listing: listingPublicKey,
            seller: listing.seller,
            platform: PLATFORM_WALLET,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log(`Bought ${amount} tokens from secondary. Tx:`, tx);

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error buying from secondary market:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [program, wallet.publicKey]
  );

  /**
   * DISTRIBUCION DE RETORNOS: Reclamar retornos mensuales en SOL
   */
  const distributeMonthly = useCallback(
    async (userTokens: number): Promise<TransactionResult> => {
      if (!program || !wallet.publicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      const today = new Date().getDate();
      if (today !== DISTRIBUTION_DAY) {
        return {
          signature: '',
          success: false,
          error: `Returns can only be claimed on day ${DISTRIBUTION_DAY} of the month`,
        };
      }

      try {
        setIsLoading(true);
        setError(null);

        const [poolPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('pool')],
          PROGRAM_ID
        );

        const userShare = (userTokens / TOKENS_PER_TRAILER) * 100;

        const tx = await program.methods
          .distributeMonthly(userTokens)
          .accounts({
            user: wallet.publicKey,
            pool: poolPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log(`Claimed monthly returns (${userShare.toFixed(2)}%). Tx:`, tx);

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error claiming monthly returns:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [program, wallet.publicKey]
  );

  const calculateEstimatedReturns = useCallback(
    (userTokens: number, poolBalance: number): number => {
      if (userTokens === 0 || poolBalance === 0) return 0;
      return (userTokens / TOKENS_PER_TRAILER) * poolBalance;
    },
    []
  );

  const closeSale = useCallback(
    async (salePublicKey: PublicKey): Promise<TransactionResult> => {
      if (!program || !wallet.publicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      try {
        setIsLoading(true);
        setError(null);

        const tx = await program.methods
          .closeSale()
          .accounts({
            authority: wallet.publicKey,
            sale: salePublicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log('Sale closed and rent recovered. Tx:', tx);

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error closing sale:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [program, wallet.publicKey]
  );

  const cancelListing = useCallback(
    async (listingPublicKey: PublicKey): Promise<TransactionResult> => {
      if (!program || !wallet.publicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      try {
        setIsLoading(true);
        setError(null);

        const tx = await program.methods
          .cancelListing()
          .accounts({
            seller: wallet.publicKey,
            listing: listingPublicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log('Listing cancelled and rent recovered. Tx:', tx);

        return { signature: tx, success: true };
      } catch (err) {
        console.error('Error cancelling listing:', err);
        return {
          signature: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [program, wallet.publicKey]
  );

  const fetchSales = useCallback(async (): Promise<ProgramAccount<Sale>[]> => {
    if (!program) {
      console.warn('Program not initialized');
      return [];
    }

    try {
      const salesAccounts = await (program.account as any).sale.all();
      setSales(salesAccounts as ProgramAccount<Sale>[]);
      return salesAccounts as ProgramAccount<Sale>[];
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError(err instanceof Error ? err.message : 'Error fetching sales');
      return [];
    }
  }, [program]);

  const fetchActiveSales = useCallback(async (): Promise<ProgramAccount<Sale>[]> => {
    const allSales = await fetchSales();
    const activeSales = allSales.filter((sale) => sale.account.active);
    return activeSales;
  }, [fetchSales]);

  const fetchListings = useCallback(async (): Promise<ProgramAccount<Listing>[]> => {
    if (!program) {
      console.warn('Program not initialized');
      return [];
    }

    try {
      const listingsAccounts = await (program.account as any).listing.all();
      setListings(listingsAccounts as ProgramAccount<Listing>[]);
      return listingsAccounts as ProgramAccount<Listing>[];
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'Error fetching listings');
      return [];
    }
  }, [program]);

  const fetchActiveListings = useCallback(async (): Promise<ProgramAccount<Listing>[]> => {
    const allListings = await fetchListings();
    const activeListings = allListings.filter((listing) => listing.account.active);
    return activeListings;
  }, [fetchListings]);

  const getSale = useCallback(
    async (salePublicKey: PublicKey): Promise<Sale | null> => {
      if (!program) return null;

      try {
        const saleAccount = await (program.account as any).sale.fetch(salePublicKey);
        return saleAccount as Sale;
      } catch (err) {
        console.error('Error fetching sale:', err);
        return null;
      }
    },
    [program]
  );

  const getListing = useCallback(
    async (listingPublicKey: PublicKey): Promise<Listing | null> => {
      if (!program) return null;

      try {
        const listingAccount = await (program.account as any).listing.fetch(listingPublicKey);
        return listingAccount as Listing;
      } catch (err) {
        console.error('Error fetching listing:', err);
        return null;
      }
    },
    [program]
  );

  useEffect(() => {
    if (program) {
      fetchSales();
      fetchListings();
    }
  }, [program, fetchSales, fetchListings]);

  return {
    // Estado
    program,
    isLoading,
    error,
    sales,
    listings,

    // Constantes
    PROGRAM_ID,
    PLATFORM_WALLET,
    TOKEN_PRICE_SOL,
    MIN_RESALE_PRICE_SOL,
    PENALTY_SOL,
    TOKENS_PER_TRAILER,
    DISTRIBUTION_DAY,

    // Mercado Primario
    initSale,
    buyPrimary,
    closeSale,

    // Mercado Secundario
    createListing,
    buySecondary,
    cancelListing,

    // Distribucion de Retornos
    distributeMonthly,
    calculateEstimatedReturns,

    // Funciones de Obtencion
    fetchSales,
    fetchActiveSales,
    fetchListings,
    fetchActiveListings,
    getSale,
    getListing,
  };
}
