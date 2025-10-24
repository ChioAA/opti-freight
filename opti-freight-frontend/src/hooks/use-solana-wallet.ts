"use client";

import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';
// Trigger deployment

// Declarar el tipo de window.solana para TypeScript
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: (args: any) => void) => void;
      off: (event: string, callback: (args: any) => void) => void;
      publicKey?: PublicKey;
      isConnected?: boolean;
    };
  }
}

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com";

export function useSolanaWallet() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Timeout de inactividad: 5 minutos
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos en milisegundos

  // Verificar si Phantom ya está conectada al montar (SOLO SI YA TIENE PERMISO)
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window !== 'undefined' && window.solana && window.solana.isConnected) {
        try {
          // onlyIfTrusted: true = NO abre Phantom, solo verifica si ya está conectada
          const response = await window.solana.connect({ onlyIfTrusted: true });
          console.log('📖 Wallet ya conectada detectada:', response.publicKey.toString());
          setPublicKey(response.publicKey);
          setConnected(true);
        } catch (error) {
          // No está conectada o no tiene permiso, no hacer nada
          console.log('ℹ️ No hay conexión previa');
        }
      }
    };
    checkExistingConnection();
  }, []);

  // Desconectar wallet automáticamente después de 5 minutos de inactividad
  useEffect(() => {
    if (!connected) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log('⏰ Timeout de inactividad - desconectando wallet...');
        disconnectWallet();
      }, INACTIVITY_TIMEOUT);
    };

    // Eventos que resetean el timer de inactividad
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Iniciar el timer
    resetTimer();

    // Cleanup
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [connected]);

  // Configurar listeners de Phantom SOLO cuando se conecta
  useEffect(() => {
    if (typeof window !== 'undefined' && window.solana && connected) {
      const handleDisconnect = () => {
        console.log('🔌 Wallet desconectada');
        setPublicKey(null);
        setConnected(false);
        setBalance(null);
      };

      const handleAccountChanged = (publicKey: PublicKey | null) => {
        if (publicKey) {
          console.log('🔄 Cuenta cambiada:', publicKey.toString());
          setPublicKey(publicKey);
          setConnected(true);
        } else {
          console.log('🔌 Usuario desconectó la wallet');
          setPublicKey(null);
          setConnected(false);
          setBalance(null);
        }
      };

      window.solana.on('disconnect', handleDisconnect);
      window.solana.on('accountChanged', handleAccountChanged);

      return () => {
        window.solana?.off('disconnect', handleDisconnect);
        window.solana?.off('accountChanged', handleAccountChanged);
      };
    }
  }, [connected]);

  // Fetch balance cuando cambia la publicKey
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
      const connection = new Connection(SOLANA_RPC, 'confirmed');
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

  const connectWallet = async () => {
    try {
      console.log('🔗 Intentando conectar wallet...');

      // Verificar si Phantom está instalado
      if (typeof window === 'undefined' || !window.solana) {
        alert('¡Phantom Wallet no está instalado!');
        return;
      }

      // Si ya está conectado, no hacer nada
      if (connected) {
        console.log('✅ Wallet ya conectada');
        return;
      }

      // Solicitar conexión a Phantom - ESTO ABRE PHANTOM Y PIDE AUTORIZACIÓN
      console.log('📱 Solicitando conexión a Phantom...');

      // Usar el método connect con opciones explícitas
      const response = await window.solana.connect({ onlyIfTrusted: false });

      const newPublicKey = response.publicKey;
      console.log('✅ Conectado con la clave pública:', newPublicKey.toString());

      setPublicKey(newPublicKey);
      setConnected(true);

    } catch (error) {
      console.error('❌ Error al conectar wallet:', error);
      alert('Error al conectar con Phantom. Por favor, asegúrate de que la extensión esté desbloqueada.');
    }
  };

  const disconnectWallet = async () => {
    try {
      console.log('🔌 Desconectando wallet...');

      if (typeof window !== 'undefined' && window.solana) {
        await window.solana.disconnect();
      }

      setPublicKey(null);
      setConnected(false);
      setBalance(null);

      console.log('✅ Wallet desconectada');
    } catch (error) {
      console.error('❌ Error al desconectar wallet:', error);
    }
  };

  // Format wallet address to show only first and last characters
  const formatAddress = (address: string, chars = 4): string => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  return {
    // Wallet state
    publicKey,
    address: publicKey?.toString() || null,
    connected,
    wallet: connected ? { adapter: { name: 'Phantom' } } : null,
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
