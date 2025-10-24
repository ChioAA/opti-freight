
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { marketplaceListings, type MarketplaceListing } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Percent, Package2, Minus, Plus, Building2, Wallet, Tag, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/auth-context";
import { useSolanaWallet } from "@/hooks/use-solana-wallet";
import { useOptiFreight } from "@/hooks/use-opti-freight";
import { useMintNFT } from "@/hooks/use-mint-nft";
import { PublicKey, Connection } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import assetNftIdl from '@/lib/anchor/idl/asset_nft.json';
import { useSecondaryMarket } from "@/hooks/use-secondary-market";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";


// Los listings de reventa ahora vienen del hook useSecondaryMarket

const content = {
  en: {
    connectWalletTitle: "Connect Your Wallet",
    connectWalletDescription: "You need to connect your wallet to invest or sell in the marketplace.",
    connectWalletButton: "Connect Wallet",
    primaryMarket: "Primary Market",
    resaleMarket: "Resale Market",
    tokensSold: "Tokens Sold",
    raised: "raised",
    estApy: "Est. APY",
    perToken: "Per Token",
    term: "Term",
    years: "Years",
    investNow: "Invest Now",
    resaleMarketTitle: "Resale Market",
    resaleMarketDescription: "Buy tokens directly from other investors. An opportunity to acquire already funded assets.",
    asset: "Asset",
    tokensAvailable: "Tokens Available",
    seller: "Seller",
    pricePerToken: "Price per Token",
    actions: "Actions",
    buy: "Buy",
    investIn: "Invest in",
    buyDialogDescription: "Select the number of tokens you wish to purchase. Each token represents a fractional ownership of the trailer.",
    tokens: "Tokens",
    available: "Available",
    price: "Price",
    totalCost: "Total Cost",
    cancel: "Cancel",
    confirmInvestment: "Confirm Investment",
    connectWalletToastTitle: "Connect your wallet",
    connectWalletToastDescription: "Please connect your wallet to complete the investment, then click 'Confirm' again.",
    investmentSuccessTitle: "Investment Successful!",
    investmentSuccessDescription: (tokens: number, name: string) => `You have purchased ${tokens} token(s) for ${name}.`,
    buyResaleToastTitle: "Buy from Resale Market",
    buyResaleToastDescription: (name: string) => `This would open a dialog to buy tokens from ${name}.`,
    serie1Description: "A new and efficient Volvo VNL 860 trailer for long-haul routes. Tokenize your investment in modern logistics.",
    serie2Description: "Invest in a reliable and in-demand Freightliner Cascadia refrigerated trailer for temperature-sensitive goods.",
    serie3Description: "A versatile Kenworth T680. High growth potential in last-mile delivery and urban logistics.",
  },
  es: {
    connectWalletTitle: "Conecta tu Billetera",
    connectWalletDescription: "Necesitas conectar tu billetera para poder invertir o vender en el marketplace.",
    connectWalletButton: "Conectar Billetera",
    primaryMarket: "Mercado Primario",
    resaleMarket: "Mercado de Reventa",
    tokensSold: "Tokens Vendidos",
    raised: "recaudados",
    estApy: "APY Est.",
    perToken: "Por Token",
    term: "Vigencia",
    years: "Años",
    investNow: "Invertir Ahora",
    resaleMarketTitle: "Mercado de Reventa",
    resaleMarketDescription: "Compra tokens directamente de otros inversores. Una oportunidad para adquirir activos ya financiados.",
    asset: "Activo",
    tokensAvailable: "Tokens Disponibles",
    seller: "Vendedor",
    pricePerToken: "Precio por Token",
    actions: "Acciones",
    buy: "Comprar",
    investIn: "Invertir en",
    buyDialogDescription: "Selecciona el número de tokens que deseas comprar. Cada token representa una propiedad fraccionada del tráiler.",
    tokens: "Tokens",
    available: "Disponibles",
    price: "Precio",
    totalCost: "Costo Total",
    cancel: "Cancelar",
    confirmInvestment: "Confirmar Inversión",
    connectWalletToastTitle: "Conecta tu billetera",
    connectWalletToastDescription: "Por favor, conecta tu billetera para completar la inversión y luego haz clic en 'Confirmar' de nuevo.",
    investmentSuccessTitle: "¡Inversión Exitosa!",
    investmentSuccessDescription: (tokens: number, name: string) => `Has comprado ${tokens} token(s) para ${name}.`,
    buyResaleToastTitle: "Compra desde el Mercado de Reventa",
    buyResaleToastDescription: (name: string) => `Esto abriría un diálogo para comprar tokens de ${name}.`,
    serie1Description: "Un nuevo y eficiente tráiler Volvo VNL 860 para rutas de larga distancia. Tokeniza tu inversión en logística moderna.",
    serie2Description: "Invierte en un confiable y demandado tráiler refrigerado Freightliner Cascadia para mercancías sensibles a la temperatura.",
    serie3Description: "Un versátil Kenworth T680. Alto potencial de crecimiento en entregas de última milla y logística urbana.",
  },
};


export default function MarketplacePage() {
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [tokensToBuy, setTokensToBuy] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState(false);
  const [pendingListing, setPendingListing] = useState<MarketplaceListing | null>(null);
  const [pendingTokens, setPendingTokens] = useState(1);
  const [updatedListings, setUpdatedListings] = useState<MarketplaceListing[]>(marketplaceListings);
  const [platformBalance, setPlatformBalance] = useState<number>(0);
  const { toast } = useToast();
  const { publicKey, connected, connectWallet: connectSolanaWallet } = useSolanaWallet();
  const { buyPrimary, sales, fetchSales } = useOptiFreight();
  const { mintOptiFreightSerie1 } = useMintNFT();
  const { language } = useLanguage();
  const [autoInitializing, setAutoInitializing] = useState(false);

  // Hook del mercado secundario
  const { listings: resaleListings, isLoading: isLoadingResale, buyFromListing } = useSecondaryMarket();

  // Conexión a Solana
  const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com";
  const connection = new Connection(SOLANA_RPC, 'confirmed');

  // Wallet de la plataforma que recibe los pagos
  const PLATFORM_WALLET = new PublicKey('468zRBWHvREsy67no7yVviW69i173dZt25XKsDqKeCNh');

  const t = content[language];

  const formatSOL = (value: number) => `${value.toFixed(2)} SOL`;

  // Función para leer el balance de la wallet de la plataforma
  const fetchPlatformBalance = async () => {
    try {
      const balance = await connection.getBalance(PLATFORM_WALLET);
      const balanceInSOL = balance / 1e9;
      console.log('💰 Balance de la plataforma:', balanceInSOL, 'SOL');
      setPlatformBalance(balanceInSOL);
      return balanceInSOL;
    } catch (error) {
      console.error('Error fetching platform balance:', error);
      return 0;
    }
  };

  // Función para contar cuántos NFTs se han minteado en el contrato
  const fetchMintedNFTsCount = async () => {
    try {
      // Crear provider de Anchor (sin wallet, solo lectura)
      const provider = new AnchorProvider(
        connection,
        {} as any,
        { commitment: 'confirmed' }
      );

      // Cargar programa asset_nft
      const program = new Program(assetNftIdl as any, provider);

      // Obtener todas las cuentas TrailerAsset del programa
      const trailerAssets = await program.account.trailerAsset.all();

      console.log('🎨 Total NFTs minteados en el contrato:', trailerAssets.length);

      return trailerAssets.length;
    } catch (error) {
      console.error('Error fetching minted NFTs count:', error);
      return 0;
    }
  };

  // Función para recargar los listings leyendo datos reales de blockchain
  const reloadListings = async () => {
    // PASO 1: Contar cuántos NFTs se han minteado en el contrato
    const nftsMinted = await fetchMintedNFTsCount();
    console.log('📊 NFTs minteados según contrato:', nftsMinted);

    // PASO 2: Calcular el SOL recaudado basado en NFTs minteados
    const updated = marketplaceListings.map((listing, index) => {
      let tokensSold = 0;
      let amountRaised = 0;

      if (index === 0 && listing.active) {
        // Serie 1: Usar cantidad de NFTs minteados en el contrato
        tokensSold = nftsMinted;
        amountRaised = tokensSold * listing.tokenPrice;

        console.log(`📊 Serie 1: ${tokensSold} NFTs vendidos = ${amountRaised.toFixed(2)} SOL esperados`);
      } else {
        // Otras series: Por ahora 0 (cuando se activen usarán la misma lógica)
        tokensSold = 0;
        amountRaised = 0;
      }

      return {
        ...listing,
        amountRaised: amountRaised,
      };
    });

    // Activar siguiente serie si la actual se agotó
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].amountRaised >= updated[i].totalValue && i + 1 < updated.length) {
        updated[i + 1].active = true;
      }
    }

    setUpdatedListings(updated);
  };

  const handleInvestNow = (listing: MarketplaceListing) => {
    // Si NO está conectada la wallet, guardar listing y abrir modal
    if (!connected || !publicKey) {
      setPendingListing(listing);
      setPendingTokens(1);
      toast({
        title: language === 'es' ? "Conecta tu Wallet" : "Connect Your Wallet",
        description: language === 'es'
          ? "Por favor conecta tu wallet Phantom para continuar"
          : "Please connect your Phantom wallet to continue",
      });
      connectSolanaWallet();
      return;
    }

    // Si YA está conectada, abrir diálogo de inversión
    setSelectedListing(listing);
    setTokensToBuy(1);
  };

  const handleCloseBuyDialog = () => {
    setSelectedListing(null);
  };

  // useEffect para cargar ventas al inicio y cada 30 segundos
  useEffect(() => {
    console.log('📊 Cargando ventas iniciales desde blockchain...');
    reloadListings();

    // Actualizar cada 30 segundos para refrescar el balance de la plataforma
    const interval = setInterval(() => {
      console.log('🔄 Actualizando balance de la plataforma...');
      reloadListings();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // useEffect para abrir el diálogo cuando la wallet se conecta
  useEffect(() => {
    if (connected && publicKey && pendingListing && !selectedListing) {
      console.log('✅ Wallet conectada, abriendo diálogo de inversión...');
      setSelectedListing(pendingListing);
      setTokensToBuy(pendingTokens);
      setPendingListing(null);
    }
  }, [connected, publicKey, pendingListing, selectedListing]);

  const processPurchase = async () => {
    if (!selectedListing || !publicKey) return;

    // Verificar balance ANTES de permitir la compra
    try {
      const balance = await connection.getBalance(publicKey);
      const balanceInSOL = balance / 1e9;

      const baseCost = tokensToBuy * selectedListing.tokenPrice;
      const fee = baseCost * 0.03;
      const totalCost = baseCost + fee;
      const gasForMinting = 0.015;
      const totalRequired = totalCost + gasForMinting;

      console.log(`💰 Balance actual: ${balanceInSOL.toFixed(4)} SOL`);
      console.log(`💸 Total requerido: ${totalRequired.toFixed(4)} SOL (${totalCost.toFixed(3)} pago + ${gasForMinting} gas NFT)`);

      if (balanceInSOL < totalRequired) {
        toast({
          variant: "destructive",
          title: language === 'es' ? "Balance insuficiente" : "Insufficient Balance",
          description: language === 'es'
            ? `Necesitas al menos ${totalRequired.toFixed(3)} SOL (${totalCost.toFixed(3)} SOL para la compra + ~${gasForMinting} SOL para mintear el NFT). Tu balance actual es ${balanceInSOL.toFixed(4)} SOL.`
            : `You need at least ${totalRequired.toFixed(3)} SOL (${totalCost.toFixed(3)} SOL for purchase + ~${gasForMinting} SOL for NFT minting). Your current balance is ${balanceInSOL.toFixed(4)} SOL.`,
          duration: 10000,
        });
        return;
      }

      // Balance suficiente, proceder con la compra
      await processPurchaseWithListing(selectedListing, tokensToBuy);
    } catch (error) {
      console.error('Error verificando balance:', error);
      toast({
        variant: "destructive",
        title: language === 'es' ? "Error" : "Error",
        description: language === 'es'
          ? "No se pudo verificar tu balance. Intenta de nuevo."
          : "Could not verify your balance. Please try again.",
      });
    }
  };

  const processPurchaseWithListing = async (listing: MarketplaceListing, tokens: number) => {
    if (!listing || !connected || !publicKey) return;

    // Prevenir múltiples ejecuciones simultáneas
    if (isProcessing) {
      console.log('⚠️ Ya hay una compra en proceso, ignorando...');
      return;
    }

    setIsProcessing(true);

    try {
      // PASO 1: PAGAR CON SOL PRIMERO
      console.log('💰 Procesando compra directa con SOL...');
      console.log(`📦 Comprando ${tokens} tokens a ${listing.tokenPrice} SOL cada uno`);

      // Calcular el costo total
      const baseCost = tokens * listing.tokenPrice;
      const fee = baseCost * 0.03; // 3% fee
      const totalCost = baseCost + fee;

      console.log(`💵 Costo base: ${baseCost} SOL`);
      console.log(`💵 Comisión (3%): ${fee} SOL`);
      console.log(`💵 Total: ${totalCost} SOL`);

      // Derivar el Sale PDA basado en la treasury authority
      const TREASURY_AUTHORITY = new PublicKey('H6XLCy6UcVa7rse3EYLcsCFdyxdX6FRGKtLAPtmgMZb5');
      const PROGRAM_ID = new PublicKey('7x4rNdNN9Szce8qfasDGiV3srApWcJ339t8iGAyKjrga');

      const [salePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('sale'), TREASURY_AUTHORITY.toBuffer()],
        PROGRAM_ID
      );

      console.log('📍 Sale PDA derivado:', salePda.toString());

      const paymentResult = await buyPrimary(salePda, tokens, publicKey);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      console.log('✅ Pago exitoso! Signature:', paymentResult.signature);

      // PASO 2: MINTEAR NFT AUTOMÁTICAMENTE DESPUÉS DEL PAGO
      console.log('🎨 Minteando NFT automáticamente...');

      // Verificar que el usuario tenga suficiente SOL para el gas del minteo
      const balance = await connection.getBalance(publicKey);
      const minBalanceForMinting = 0.015 * 1e9; // 0.015 SOL para gas del minteo

      let mintResult;
      if (balance < minBalanceForMinting) {
        console.warn('⚠️ Balance insuficiente para mintear NFT. Se necesita ~0.015 SOL para gas.');
        mintResult = {
          success: false,
          error: 'Insufficient balance for NFT minting (~0.015 SOL needed for gas)'
        };
      } else {
        mintResult = await mintOptiFreightSerie1(tokens, publicKey);

        if (!mintResult.success) {
          console.error('⚠️ Error minteando NFT:', mintResult.error);
          // El pago ya se completó, no fallamos toda la compra
        } else {
          console.log('✅ NFT minteado automáticamente:', mintResult.mintAddress);
        }
      }

      // Guardar la compra en localStorage para referencia rápida
      const purchase = {
        id: `${listing.id}-${Date.now()}`,
        name: listing.name,
        series: listing.name.replace('Opti-Freight ', ''),
        value: tokens * listing.tokenPrice,
        tokens: tokens,
        buyer: publicKey?.toString() || '', // Agregar wallet del comprador
        timestamp: Date.now(), // Agregar timestamp numérico
        purchaseDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + listing.termYears * 365 * 24 * 60 * 60 * 1000).toISOString(),
        paymentSignature: paymentResult.signature,
        nftMintAddress: mintResult.success ? mintResult.mintAddress : 'NFT_PENDING',
        nftMintSignature: mintResult.success ? mintResult.signature : 'NFT_PENDING',
        saleAddress: salePda.toString(),
        listing: listing,
      };

      const existingPurchases = JSON.parse(localStorage.getItem('opti-freight-purchases') || '[]');
      existingPurchases.push(purchase);
      localStorage.setItem('opti-freight-purchases', JSON.stringify(existingPurchases));

      console.log('Purchase saved to localStorage:', purchase);

      // Recargar listings para actualizar contadores
      reloadListings();

      // Mostrar mensaje de éxito ANTES de refrescar ventas
      toast({
        title: t.investmentSuccessTitle,
        description: language === 'es'
          ? `¡Has comprado ${tokens} token(s) para ${listing.name}! Tu NFT certificado ya está en tu wallet.`
          : `You have purchased ${tokens} token(s) for ${listing.name}! Your NFT certificate is now in your wallet.`,
        duration: 7000,
      });

      // Refrescar la lista de ventas para actualizar el contador (no crítico)
      try {
        await fetchSales();
      } catch (err) {
        console.warn('Could not refresh sales list:', err);
        // No mostrar error al usuario, la compra ya fue exitosa
      }

      handleCloseBuyDialog();

    } catch (error: any) {
      console.error('Investment error:', error);
      toast({
        variant: "destructive",
        title: language === 'es' ? "Error en la transacción" : "Transaction Error",
        description: error.message || (language === 'es'
          ? "No se pudo completar la inversión. Verifica tu balance de SOL."
          : "Could not complete investment. Check your SOL balance."),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmInvestment = async () => {
    if (!selectedListing) return;

    // Si wallet no está conectada, esto no debería pasar (el diálogo solo se abre si está conectada)
    if (!connected || !publicKey) {
      toast({
        variant: "destructive",
        title: language === 'es' ? "Wallet no conectada" : "Wallet not connected",
        description: language === 'es'
          ? "Por favor conecta tu wallet primero"
          : "Please connect your wallet first",
      });
      return;
    }

    // Procesar la compra
    await processPurchase();
  };

  const totalCost = selectedListing ? tokensToBuy * selectedListing.tokenPrice : 0;
  const maxTokensToBuy = selectedListing ? Math.floor((selectedListing.totalValue - selectedListing.amountRaised) / selectedListing.tokenPrice) : 0;
  
  const handleBuyResale = async (listingPublicKey: PublicKey) => {
    if (!connected || !publicKey) {
        connectSolanaWallet();
        toast({
            title: t.connectWalletToastTitle,
            description: language === 'es'
              ? "Por favor, conecta tu billetera para comprar del mercado de reventa."
              : "Please connect your wallet to buy from resale market.",
        });
        return;
    }

    try {
      console.log('💰 Comprando NFT del mercado secundario...');

      const result = await buyFromListing(listingPublicKey, publicKey);

      if (result.success) {
        toast({
          title: language === 'es' ? '¡Compra Exitosa!' : 'Purchase Successful!',
          description: language === 'es'
            ? 'Has comprado el NFT exitosamente.'
            : 'You have successfully purchased the NFT.',
          duration: 7000,
        });

        console.log('✅ NFT comprado! Signature:', result.signature);
      } else {
        throw new Error(result.error || 'Error en la compra');
      }

    } catch (error: any) {
      console.error('Error buying NFT:', error);
      toast({
        variant: "destructive",
        title: language === 'es' ? 'Error' : 'Error',
        description: error.message || (language === 'es'
          ? 'No se pudo completar la compra.'
          : 'Could not complete purchase.'),
        duration: 7000,
      });
    }
  }


  return (
    <>
      <Tabs defaultValue="primary">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="primary">{t.primaryMarket}</TabsTrigger>
          <TabsTrigger value="resale">{t.resaleMarket}</TabsTrigger>
        </TabsList>

        <TabsContent value="primary">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
            {updatedListings.filter(listing => listing.active).map((listing) => {
              // Tokens vendidos = SOL recaudado / precio por token
              const tokensSold = listing.amountRaised / listing.tokenPrice;
              const totalTokens = listing.totalValue / listing.tokenPrice;
              const progress = (listing.amountRaised / listing.totalValue) * 100;
              
              return (
                <Card key={listing.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="p-0">
                      <div className="aspect-video overflow-hidden rounded-t-lg border-b relative bg-black">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute z-0 w-full h-full object-contain object-center"
                        >
                            <source src="https://www.optifreight.io/videos/membership.mp4" type="video/mp4" />
                        </video>
                      </div>
                      <div className="p-6 text-center">
                        <CardTitle>{listing.name}</CardTitle>
                        <CardDescription>{t[listing.descriptionKey]}</CardDescription>
                      </div>
                    <Separator />
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4 pt-6">
                    <div>
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="text-muted-foreground">{t.tokensSold}</span>
                        <span className="font-medium">{tokensSold.toFixed(0)} / {totalTokens}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1 text-right">{formatSOL(listing.amountRaised)} {t.raised}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm pt-2">
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Percent className="w-5 h-5 text-primary"/>
                        <div>
                          <div className="font-semibold">{listing.apy}%</div>
                          <div className="text-xs text-muted-foreground">{t.estApy}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Package2 className="w-5 h-5 text-primary"/>
                        <div>
                          <div className="font-semibold">{formatSOL(listing.tokenPrice)}</div>
                          <div className="text-xs text-muted-foreground">{t.perToken}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <CalendarDays className="w-5 h-5 text-primary"/>
                        <div>
                          <div className="font-semibold">{listing.termYears} {t.years}</div>
                          <div className="text-xs text-muted-foreground">{t.term}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={() => handleInvestNow(listing)}>{t.investNow}</Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="resale">
           <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t.resaleMarketTitle}</CardTitle>
              <CardDescription>{t.resaleMarketDescription}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.asset}</TableHead>
                      <TableHead>{t.tokensAvailable}</TableHead>
                      <TableHead>{t.seller}</TableHead>
                      <TableHead>{language === 'es' ? 'Dirección Mint' : 'Mint Address'}</TableHead>
                      <TableHead className="text-right">{t.pricePerToken}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingResale ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {language === 'es' ? 'Cargando listings...' : 'Loading listings...'}
                        </TableCell>
                      </TableRow>
                    ) : resaleListings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {language === 'es' ? 'No hay NFTs en venta actualmente.' : 'No NFTs for sale currently.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      resaleListings.map((listing) => {
                        const priceInSOL = Number(listing.account.price.toString()) / 1e9;
                        const sellerShort = `${listing.account.seller.toString().slice(0, 4)}...${listing.account.seller.toString().slice(-4)}`;
                        const nftMint = listing.account.nftMint.toString();
                        const nftMintShort = `${nftMint.slice(0, 4)}...${nftMint.slice(-4)}`;

                        return (
                          <TableRow key={listing.publicKey.toString()}>
                            <TableCell>
                              <div className="font-medium">OptiFreight NFT</div>
                              <div className="text-sm text-muted-foreground">Serie 1</div>
                            </TableCell>
                            <TableCell>1 NFT</TableCell>
                            <TableCell><Badge variant="secondary" className="font-mono">{sellerShort}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">
                              <a
                                href={`https://explorer.solana.com/address/${nftMint}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {nftMintShort}
                              </a>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{formatSOL(priceInSOL)}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleBuyResale(listing.publicKey)}>{t.buy}</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedListing} onOpenChange={(isOpen) => !isOpen && handleCloseBuyDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.investIn} {selectedListing?.name}</DialogTitle>
            <DialogDescription>
              {t.buyDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tokens-buy" className="text-right">
                {t.tokens}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTokensToBuy(p => Math.max(1, p-1))}><Minus className="h-4 w-4" /></Button>
                <Input
                  id="tokens-buy"
                  type="number"
                  value={tokensToBuy}
                  onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0 && value <= maxTokensToBuy) {
                          setTokensToBuy(value);
                      } else if (e.target.value === '') {
                        setTokensToBuy(1);
                      }
                  }}
                  className="col-span-2 h-8 text-center"
                  min="1"
                  max={maxTokensToBuy}
                />
                 <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTokensToBuy(p => Math.min(maxTokensToBuy, p + 1))}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t.available}</Label>
                <div className="col-span-3 text-sm text-muted-foreground">{maxTokensToBuy.toFixed(0)} {t.tokens.toLowerCase()}</div>
             </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t.price}</Label>
                <div className="col-span-3 font-semibold">{formatSOL(selectedListing?.tokenPrice || 0)} / token</div>
             </div>
             <Separator className="my-2" />
             <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">{t.totalCost}</Label>
                <div className="col-span-3 text-lg font-bold text-primary">{totalCost.toFixed(3)} SOL</div>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseBuyDialog} disabled={isProcessing}>{t.cancel}</Button>
            <Button onClick={handleConfirmInvestment} disabled={isProcessing}>
              {isProcessing ? (language === 'es' ? 'Procesando...' : 'Processing...') : t.confirmInvestment}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
