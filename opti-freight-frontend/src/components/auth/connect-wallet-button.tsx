"use client";

import { useAuth } from "@/contexts/auth-context";
import { useSolanaWallet } from "@/hooks/use-solana-wallet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

const content = {
    en: {
        buyCrypto: "Buy Crypto",
        connectWallet: "Connect Wallet",
        disconnectWallet: "Disconnect Wallet",
        logOut: "Log Out",
        fiatOnRampToastTitle: "Fiat On-Ramp",
        fiatOnRampToastDescription: "This would integrate with a service like MoonPay or Stripe.",
        walletConnected: "Wallet Connected",
    },
    es: {
        buyCrypto: "Comprar Cripto",
        connectWallet: "Conectar Billetera",
        disconnectWallet: "Desconectar Billetera",
        logOut: "Cerrar Sesión",
        fiatOnRampToastTitle: "Rampa Fiat",
        fiatOnRampToastDescription: "Esto se integraría con un servicio como MoonPay o Stripe.",
        walletConnected: "Billetera Conectada",
    }
}


export function ConnectWalletButton() {
  const { user, logout } = useAuth();
  const { connected, address, balance, connectWallet, disconnectWallet, formatAddress } = useSolanaWallet();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = content[language];

  const handleBuyCrypto = () => {
    toast({
      title: t.fiatOnRampToastTitle,
      description: t.fiatOnRampToastDescription,
    });
  };

  const handleDisconnectWallet = async () => {
    try {
      // Llamar directamente a Phantom para desconectar
      if (typeof window !== 'undefined' && window.solana) {
        await window.solana.disconnect();
        console.log('🔌 Wallet desconectada desde dropdown');

        // Recargar la página para resetear todos los estados
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Error al desconectar wallet:', error);
    }
  };

  const getInitials = (name = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  }

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-3 cursor-pointer rounded-full border border-transparent hover:border-border p-1 transition-colors">
          <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://picsum.photos/seed/${user.email}/40/40`} alt="User Avatar" data-ai-hint="person" />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {connected && address && (
          <>
            <DropdownMenuItem disabled>
                <Wallet className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">{formatAddress(address)}</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground ml-6">
                  {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
                </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleBuyCrypto}>
              <Landmark className="mr-2 h-4 w-4 text-primary" />
              <span>{t.buyCrypto}</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={handleDisconnectWallet}>
              <Wallet className="mr-2 h-4 w-4" />
              <span>{t.disconnectWallet}</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t.logOut}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
