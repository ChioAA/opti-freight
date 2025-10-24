
"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useSolanaWallet } from "@/hooks/use-solana-wallet";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Truck, Menu, Briefcase, User, Wallet } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LoginDialog } from "@/components/auth/login-dialog";
import { ConnectWalletButton } from "@/components/auth/connect-wallet-button";
import { useLanguage } from "@/contexts/language-context";

const navItems = {
  en: [
    { href: "/app/portfolio", icon: Briefcase, label: "Portfolio" },
    { href: "/app/marketplace", icon: Truck, label: "Marketplace" },
  ],
  es: [
    { href: "/app/portfolio", icon: Briefcase, label: "Portafolio" },
    { href: "/app/marketplace", icon: Truck, label: "Marketplace" },
  ],
};

const content = {
  en: {
    loginTitle: "Access Your Account",
    loginDescription: "Please log in to view your portfolio, track returns, and access the investment marketplace.",
    loginButton: "Log In",
  },
  es: {
    loginTitle: "Accede a Tu Cuenta",
    loginDescription: "Por favor, inicia sesión para ver tu portafolio, seguir tus retornos y acceder al marketplace de inversión.",
    loginButton: "Iniciar Sesión",
  },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { connected, publicKey, formatAddress } = useSolanaWallet();
  const pathname = usePathname();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { language, setLanguage } = useLanguage();

  const t = content[language];
  const currentNavItems = navItems[language];
  const currentNavItem = currentNavItems.find(item => pathname.startsWith(item.href));

  // Mostrar saludo solo en Portfolio cuando wallet esté conectada
  const isPortfolio = pathname === '/app/portfolio';
  const showWalletGreeting = isPortfolio && connected && publicKey && user;


  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 text-primary font-semibold">
          <Logo className="h-8 w-auto" />
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {currentNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-all",
                pathname.startsWith(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <div className="grid w-full lg:grid-cols-[280px_1fr] min-h-screen">
        <aside className="hidden border-r bg-card lg:block">
          {sidebarContent}
        </aside>
        <div className="flex flex-col">
          <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-[280px] bg-card">
                    {sidebarContent}
                  </SheetContent>
                </Sheet>
                <h1 className="text-xl font-semibold hidden md:block">{currentNavItem?.label}</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                  <button 
                    className={`transition-colors hover:text-foreground ${language === 'en' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                    onClick={() => setLanguage('en')}
                  >
                    ENG
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button 
                    className={`transition-colors hover:text-foreground ${language === 'es' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                    onClick={() => setLanguage('es')}
                  >
                    ESP
                  </button>
              </div>
              {user && <ConnectWalletButton />}
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-background">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : user ? (
              children
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm relative overflow-hidden">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute z-0 w-full h-full object-cover object-center"
                    >
                        <source src="https://www.optifreight.io/videos/hero.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-black/70 z-10" />
                    <div className="relative z-20 flex flex-col items-center gap-4 text-center p-8">
                        <Logo className="h-16 w-auto" />
                        <h3 className="text-2xl font-bold tracking-tight text-white">{t.loginTitle}</h3>
                        <p className="text-neutral-300 max-w-sm">
                          {t.loginDescription}
                        </p>
                        <Button className="mt-4" onClick={() => setIsLoginOpen(true)}>
                          {t.loginButton}
                        </Button>
                    </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <LoginDialog isOpen={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  );
}
