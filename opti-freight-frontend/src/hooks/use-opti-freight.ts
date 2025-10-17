'use client';

/**
 * Hook Unificado para el Programa Opti-Freight
 * Se conecta al programa unificado desplegado de opti-freight en Devnet
 * Maneja Mercado Primario, Mercado Secundario y Distribucion de Retornos
 */

import { useCallback, useEffect, useState } from 'react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from '@solana/spl-token';
import optiFreightIdl from '@/lib/idl/opti_freight.json';

// Constantes del Programa y Tokens
const PROGRAM_ID = new PublicKey('HAsA9cM5SRhGKNNrQy9c7JF3rCsGwRC6A5ycNbKxpnWU');
const USDC_MINT = new PublicKey('3PS5pGyQXco4WVFeF7eLvSKfM86E4kzC73d7VrpfhEo9');
const PLATFORM_WALLET = new PublicKey('468zRBWHvREsy67no7yVviW69i173dZt25XKsDqKeCNh');

// Constantes de Logica de Negocio
const TOKENS_PER_TRAILER = 1000;
const TOKEN_PRICE_USDC = 200; // $200 por token
const PRIMARY_FEE_BPS = 300; // 3%
const MIN_RESALE_PRICE = 250; // $250 minimo
const PENALTY_USDC = 50; // $50 penalizacion
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

        // Usar el IDL generado del programa
        const programInstance = new Program(optiFreightIdl as any, PROGRAM_ID, provider);
        setProgram(programInstance);
      } catch (err) {
        console.error('Failed to initialize program:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  }, [wallet.publicKey, wallet.signTransaction, connection]);

  /**
   * MERCADO PRIMARIO: Inicializar una nueva venta (Solo Admin)
   * Crea una venta de 1,000 tokens a $200 cada uno
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

      // Derivar PDA para cuenta de venta
      const [salePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('sale'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Llamar instruccion init_sale
      const tx = await program.methods
        .initSale()
        .accounts({
          authority: wallet.publicKey,
          sale: salePda,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
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
   * MERCADO PRIMARIO: Comprar tokens de la venta inicial
   * Precio: $200 por token + 3% de comision
   */
  const buyPrimary = useCallback(
    async (salePublicKey: PublicKey, amount: number): Promise<TransactionResult> => {
      if (!program || !wallet.publicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      // Validar precio del lado del cliente
      const baseCost = TOKEN_PRICE_USDC * amount;
      const fee = (baseCost * PRIMARY_FEE_BPS) / 10000;
      const totalCost = baseCost + fee;

      try {
        setIsLoading(true);
        setError(null);

        // Obtener cuentas de tokens
        const buyerUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          wallet.publicKey
        );

        const sellerUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          (await program.account.sale.fetch(salePublicKey)).authority
        );

        const platformUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          PLATFORM_WALLET
        );

        // Ejecutar instruccion buy_primary
        const tx = await program.methods
          .buyPrimary(amount)
          .accounts({
            buyer: wallet.publicKey,
            sale: salePublicKey,
            buyerUsdcAccount,
            sellerUsdcAccount,
            platformUsdcAccount,
            usdcMint: USDC_MINT,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log(`Bought ${amount} tokens for ${totalCost} USDC. Tx:`, tx);

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
    [program, wallet.publicKey]
  );

  /**
   * MERCADO SECUNDARIO: Crear un listado para revender tokens
   * Precio minimo: $250 ($200 + $50 penalizacion)
   */
  const createListing = useCallback(
    async (price: number, amount: number): Promise<TransactionResult> => {
      if (!program || !wallet.publicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      // Validar precio minimo del lado del cliente
      if (price < MIN_RESALE_PRICE) {
        return {
          signature: '',
          success: false,
          error: `Minimum resale price is $${MIN_RESALE_PRICE} USDC`,
        };
      }

      try {
        setIsLoading(true);
        setError(null);

        // Derivar PDA para cuenta de listado
        const [listingPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('listing'), wallet.publicKey.toBuffer()],
          PROGRAM_ID
        );

        // Convertir precio a lamports (6 decimales para USDC)
        const priceInLamports = new BN(price * 1_000_000);

        const tx = await program.methods
          .createListing(priceInLamports, amount)
          .accounts({
            seller: wallet.publicKey,
            listing: listingPda,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();

        console.log(`Listed ${amount} tokens at $${price}. Tx:`, tx);

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
   * MERCADO SECUNDARIO: Comprar de un listado
   * Incluye penalizacion de $50 + 3% de comision a la plataforma
   */
  const buySecondary = useCallback(
    async (listingPublicKey: PublicKey, amount: number): Promise<TransactionResult> => {
      if (!program || !wallet.publicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      try {
        setIsLoading(true);
        setError(null);

        // Obtener listado para conseguir vendedor y precio
        const listing = await program.account.listing.fetch(listingPublicKey);

        // Calcular costos
        const pricePerToken = listing.price.toNumber() / 1_000_000;
        const subtotal = pricePerToken * amount;
        const fee = (subtotal * SECONDARY_FEE_BPS) / 10000;
        const penalty = PENALTY_USDC * amount;
        const totalBuyerPays = subtotal + fee;
        const sellerReceives = subtotal - penalty;
        const platformReceives = penalty + fee;

        console.log('Secondary market purchase breakdown:', {
          subtotal,
          fee,
          penalty,
          totalBuyerPays,
          sellerReceives,
          platformReceives,
        });

        // Obtener cuentas de tokens
        const buyerUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          wallet.publicKey
        );

        const sellerUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          listing.seller
        );

        const platformUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          PLATFORM_WALLET
        );

        // Ejecutar instruccion buy_secondary
        const tx = await program.methods
          .buySecondary(amount)
          .accounts({
            buyer: wallet.publicKey,
            listing: listingPublicKey,
            seller: listing.seller,
            buyerUsdcAccount,
            sellerUsdcAccount,
            platformUsdcAccount,
            usdcMint: USDC_MINT,
            tokenProgram: TOKEN_PROGRAM_ID,
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
   * DISTRIBUCION DE RETORNOS: Reclamar retornos mensuales (Dia 20)
   * Distribucion prorrateada basada en propiedad de tokens
   */
  const distributeMonthly = useCallback(
    async (userTokens: number): Promise<TransactionResult> => {
      if (!program || !wallet.publicKey) {
        return { signature: '', success: false, error: 'Wallet not connected' };
      }

      // Validacion del lado del cliente: Verificar si hoy es el dia 20
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

        // Derivar PDA para el pool de distribucion
        const [poolPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('pool')],
          PROGRAM_ID
        );

        const userUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          wallet.publicKey
        );

        const poolUsdcAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          poolPda,
          true // Permitir propietario fuera de la curva
        );

        // Calcular participacion del usuario
        const userShare = (userTokens / TOKENS_PER_TRAILER) * 100;

        const tx = await program.methods
          .distributeMonthly(userTokens)
          .accounts({
            user: wallet.publicKey,
            pool: poolPda,
            userUsdcAccount,
            poolUsdcAccount,
            usdcMint: USDC_MINT,
            tokenProgram: TOKEN_PROGRAM_ID,
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

  /**
   * Calcular retornos mensuales estimados basados en propiedad de tokens
   */
  const calculateEstimatedReturns = useCallback(
    (userTokens: number, poolBalance: number): number => {
      if (userTokens === 0 || poolBalance === 0) return 0;
      return (userTokens / TOKENS_PER_TRAILER) * poolBalance;
    },
    []
  );

  /**
   * Cerrar una venta y recuperar renta (Solo Admin)
   */
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

  /**
   * Cancelar un listado y recuperar renta
   */
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

  /**
   * Obtener todas las ventas desde la blockchain
   * Retorna tanto las ventas activas como inactivas
   */
  const fetchSales = useCallback(async (): Promise<ProgramAccount<Sale>[]> => {
    if (!program) {
      console.warn('Program not initialized');
      return [];
    }

    try {
      const salesAccounts = await program.account.sale.all();
      setSales(salesAccounts as ProgramAccount<Sale>[]);
      return salesAccounts as ProgramAccount<Sale>[];
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError(err instanceof Error ? err.message : 'Error fetching sales');
      return [];
    }
  }, [program]);

  /**
   * Obtener solo las ventas activas
   */
  const fetchActiveSales = useCallback(async (): Promise<ProgramAccount<Sale>[]> => {
    const allSales = await fetchSales();
    const activeSales = allSales.filter((sale) => sale.account.active);
    return activeSales;
  }, [fetchSales]);

  /**
   * Obtener todos los listados desde la blockchain
   */
  const fetchListings = useCallback(async (): Promise<ProgramAccount<Listing>[]> => {
    if (!program) {
      console.warn('Program not initialized');
      return [];
    }

    try {
      const listingsAccounts = await program.account.listing.all();
      setListings(listingsAccounts as ProgramAccount<Listing>[]);
      return listingsAccounts as ProgramAccount<Listing>[];
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'Error fetching listings');
      return [];
    }
  }, [program]);

  /**
   * Obtener solo los listados activos
   */
  const fetchActiveListings = useCallback(async (): Promise<ProgramAccount<Listing>[]> => {
    const allListings = await fetchListings();
    const activeListings = allListings.filter((listing) => listing.account.active);
    return activeListings;
  }, [fetchListings]);

  /**
   * Obtener una venta especifica por clave publica
   */
  const getSale = useCallback(
    async (salePublicKey: PublicKey): Promise<Sale | null> => {
      if (!program) return null;

      try {
        const saleAccount = await program.account.sale.fetch(salePublicKey);
        return saleAccount as Sale;
      } catch (err) {
        console.error('Error fetching sale:', err);
        return null;
      }
    },
    [program]
  );

  /**
   * Obtener un listado especifico por clave publica
   */
  const getListing = useCallback(
    async (listingPublicKey: PublicKey): Promise<Listing | null> => {
      if (!program) return null;

      try {
        const listingAccount = await program.account.listing.fetch(listingPublicKey);
        return listingAccount as Listing;
      } catch (err) {
        console.error('Error fetching listing:', err);
        return null;
      }
    },
    [program]
  );

  // Obtencion automatica al inicializar el programa
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
    USDC_MINT,
    PLATFORM_WALLET,
    TOKEN_PRICE_USDC,
    MIN_RESALE_PRICE,
    PENALTY_USDC,
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
