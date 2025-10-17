"use client";

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';

export function useSolanaWallet() {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch SOL balance when wallet connects
  useEffect(() => {
    if (publicKey && connected) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [publicKey, connected]);

  const fetchBalance = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const lamports = await connection.getBalance(publicKey);
      const sol = lamports / LAMPORTS_PER_SOL;
      setBalance(sol);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = () => {
    setVisible(true);
  };

  const disconnectWallet = async () => {
    await disconnect();
  };

  // Format wallet address to show only first and last characters
  const formatAddress = (address: string, chars = 4): string => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  return {
    // Wallet state
    publicKey,
    address: publicKey?.toBase58() || null,
    connected,
    wallet,
    balance,
    loading,

    // Actions
    connectWallet,
    disconnectWallet,
    fetchBalance,

    // Utilities
    formatAddress,
  };
}

// Hook for checking if user has minimum SOL for transactions
export function useHasMinimumBalance(minimumSol: number = 0.01) {
  const { balance } = useSolanaWallet();

  if (balance === null) return false;
  return balance >= minimumSol;
}

// Hook for USDC balance (SPL Token)
export function useUSDCBalance() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // USDC Mint address on Devnet (custom test token with 1M USDC)
  // For mainnet, use: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  const USDC_MINT_DEVNET = new PublicKey('3PS5pGyQXco4WVFeF7eLvSKfM86E4kzC73d7VrpfhEo9');

  useEffect(() => {
    if (publicKey && connected) {
      fetchUSDCBalance();
    } else {
      setUsdcBalance(null);
    }
  }, [publicKey, connected]);

  const fetchUSDCBalance = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);

      // Get token accounts for this wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: USDC_MINT_DEVNET }
      );

      if (tokenAccounts.value.length > 0) {
        const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
        const balance = accountInfo.tokenAmount.uiAmount;
        setUsdcBalance(balance);
      } else {
        setUsdcBalance(0);
      }
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      setUsdcBalance(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    usdcBalance,
    loading,
    refresh: fetchUSDCBalance,
  };
}
