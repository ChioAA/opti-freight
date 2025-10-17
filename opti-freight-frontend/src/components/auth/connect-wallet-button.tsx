
"use client";

import { useWallet, useAuth } from "@/contexts/auth-context";
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
    },
    es: {
        buyCrypto: "Comprar Cripto",
        connectWallet: "Conectar Billetera",
        disconnectWallet: "Desconectar Billetera",
        logOut: "Cerrar Sesión",
        fiatOnRampToastTitle: "Rampa Fiat",
        fiatOnRampToastDescription: "Esto se integraría con un servicio como MoonPay o Stripe.",
    }
}


export function ConnectWalletButton() {
  const { user, logout } = useAuth();
  const { isWalletConnected, connectWallet, disconnectWallet } = useWallet();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = content[language];

  const handleBuyCrypto = () => {
    toast({
      title: t.fiatOnRampToastTitle,
      description: t.fiatOnRampToastDescription,
    });
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
        {isWalletConnected ? (
          <>
            <DropdownMenuItem disabled>
                <Wallet className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">0xAb...cdef</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleBuyCrypto}>
              <Landmark className="mr-2 h-4 w-4 text-primary" />
              <span>{t.buyCrypto}</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={disconnectWallet}>
              <Wallet className="mr-2 h-4 w-4" />
              <span>{t.disconnectWallet}</span>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={connectWallet}>
            <Wallet className="mr-2 h-4 w-4" />
            <span>{t.connectWallet}</span>
          </DropdownMenuItem>
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
