
"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, ShieldCheck, TrendingUp } from 'lucide-react';
import { LoginDialog } from "@/components/auth/login-dialog";
import { useLanguage } from "@/contexts/language-context";

function LandingLayout({ children, onLoginClick }: { children: ReactNode, onLoginClick: () => void }) {
  const { language, setLanguage } = useLanguage();
  
  const t = language === 'es' ? 
  { login: 'Iniciar sesión' } : 
  { login: 'Log In' };

  return (
    <div className="bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
          </Link>
          
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
            <Button onClick={onLoginClick}>
               {t.login}
            </Button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}


export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login');
  const { language } = useLanguage();


  const handleLoginClick = () => {
    setLoginMode('login');
    setIsLoginOpen(true);
  }

  const handleSignupClick = () => {
    setLoginMode('signup');
    setIsLoginOpen(true);
  }

  const content = {
    en: {
      title: "The Future of Logistics Investing.",
      description: "Opti-Freight tokenizes Real World Assets (RWA), allowing you to invest in the logistics industry by purchasing digital tokens that represent fractional ownership of trucks.",
      explore: "Explore Marketplace",
      whyTitle: "A New Asset Class, Unlocked",
      whySubtitle: "Why Opti-Freight?",
      whyDescription: "We are democratizing access to the backbone of the economy. Invest directly in the real-world assets that power global trade, one token at a time.",
      feature1Title: "High-Yield Returns",
      feature1Description: "Earn passive income from leasing fees. Our trucks are in constant demand, providing consistent and attractive APYs.",
      feature2Title: "Low Entry Barrier",
      feature2Description: "Start your investment portfolio with as little as 1.2 SOL. No need for large capital outlays to enter the logistics market.",
      feature3Title: "Asset-Backed Security",
      feature3Description: "Each token is a digital representation of ownership in a physical, insured truck. Your investment is tied to a tangible, revenue-generating Real World Asset.",
      ctaTitle: "Ready to Build Your Fleet?",
      ctaDescription: "Create your account to browse available truck assets and start earning passive income from the logistics revolution.",
      ctaButton: "Start Investing Today",
      footer: "All Rights Reserved."
    },
    es: {
      title: "El Futuro de la Inversión en Logística.",
      description: "Opti-Freight tokeniza Activos del Mundo Real (RWA), permitiéndote invertir en la industria logística comprando tokens digitales que representan la propiedad fraccionada de tráilers.",
      explore: "Explorar Marketplace",
      whyTitle: "Una Nueva Clase de Activos, Desbloqueada",
      whySubtitle: "¿Por qué Opti-Freight?",
      whyDescription: "Estamos democratizando el acceso a la columna vertebral de la economía. Invierte directamente en los activos del mundo real que impulsan el comercio global, un token a la vez.",
      feature1Title: "Rendimientos de Alta Rentabilidad",
      feature1Description: "Obtén ingresos pasivos de las tarifas de arrendamiento. Nuestros tráilers tienen una demanda constante, proporcionando APYs consistentes y atractivos.",
      feature2Title: "Baja Barrera de Entrada",
      feature2Description: "Comienza tu cartera de inversiones con tan solo 1.2 SOL. No se necesitan grandes desembolsos de capital para ingresar al mercado logístico.",
      feature3Title: "Seguridad Respaldada por Activos",
      feature3Description: "Cada token es una representación digital de la propiedad de un tráiler físico y asegurado. Tu inversión está ligada a un Activo del Mundo Real tangible y que genera ingresos.",
      ctaTitle: "¿Listo para Construir tu Flota?",
      ctaDescription: "Crea tu cuenta para explorar los activos de tráilers disponibles y comenzar a obtener ingresos pasivos de la revolución logística.",
      ctaButton: "Empieza a Invertir Hoy",
      footer: "Todos los Derechos Reservados."
    }
  }

  const t = content[language];

  return (
    <>
    <LandingLayout onLoginClick={handleLoginClick}>
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">
          <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center text-center px-4 overflow-hidden">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute z-0 w-full h-full object-cover object-center"
            >
              <source src="https://www.optifreight.io/videos/Video_Acceso.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/60 z-10" />
            <div className="relative z-20 space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
                {t.title}
              </h1>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-neutral-300">
                {t.description}
              </p>
              <div className="space-x-4">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/app/marketplace">
                    {t.explore} <ArrowRight className="ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section id="proposal" className="py-16 md:py-24 bg-card">
            <div className="container mx-auto px-4">
              <div className="text-center space-y-3 mb-12">
                <p className="text-primary font-bold text-2xl">{t.whySubtitle}</p>
                <h2 className="text-3xl md:text-4xl font-bold">{t.whyTitle}</h2>
                <p className="max-w-2xl mx-auto text-muted-foreground">
                  {t.whyDescription}
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center bg-background/50 p-6 rounded-lg">
                    <div className="mx-auto bg-primary/10 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{t.feature1Title}</h3>
                    <p className="text-muted-foreground mt-2">
                      {t.feature1Description}
                    </p>
                </div>
                <div className="text-center bg-background/50 p-6 rounded-lg">
                    <div className="mx-auto bg-primary/10 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{t.feature2Title}</h3>
                    <p className="text-muted-foreground mt-2">
                      {t.feature2Description}
                    </p>
                </div>
                <div className="text-center bg-background/50 p-6 rounded-lg">
                    <div className="mx-auto bg-primary/10 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{t.feature3Title}</h3>
                    <p className="text-muted-foreground mt-2">
                      {t.feature3Description}
                    </p>
                </div>
              </div>
            </div>
          </section>
          
          <section id="earn" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
                    <div className="relative aspect-square md:aspect-auto md:h-full">
                       <Image 
                         src="https://www.optifreight.io/_next/image?url=%2Fimages%2FIllustraciones%2Fconductor.png&w=1920&q=75"
                         alt="Opti-Freight driver"
                         fill
                         className="object-contain"
                       />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold tracking-tight mb-4">{t.ctaTitle}</h2>
                        <p className="text-muted-foreground max-w-xl mx-auto md:mx-0 mb-8">
                            {t.ctaDescription}
                        </p>
                         <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSignupClick}>
                            {t.ctaButton} <ArrowRight className="ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
          </section>
        </main>

        <footer className="bg-card border-t">
          <div className="container mx-auto py-6 px-4 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Opti-Freight. {t.footer}</p>
          </div>
        </footer>
      </div>
    </LandingLayout>
    <LoginDialog isOpen={isLoginOpen} onOpenChange={setIsLoginOpen} initialMode={loginMode} />
    </>
  );
}
