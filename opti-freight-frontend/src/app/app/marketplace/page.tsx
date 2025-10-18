
"use client";

import Image from "next/image";
import { useState } from "react";
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
import { PublicKey } from '@solana/web3.js';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";


const resaleListings = [
    { id: 'resale-001', name: 'Opti-Freight 001', series: 'Volvo VNL 860', seller: '0x12...3456', tokensAvailable: 15, pricePerToken: 250 },
    { id: 'resale-002', name: 'Opti-Freight 002', series: 'Freightliner Cascadia', seller: '0x78...9abc', tokensAvailable: 20, pricePerToken: 250 },
];

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
  const { toast } = useToast();
  const { isWalletConnected, connectWallet } = useWallet();
  const { publicKey, connected } = useSolanaWallet();
  const { buyPrimary, sales, fetchSales, initSale } = useOptiFreight();
  const { language } = useLanguage();
  const [autoInitializing, setAutoInitializing] = useState(false);

  const t = content[language];

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const handleInvestNow = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setTokensToBuy(1);
  };

  const handleCloseBuyDialog = () => {
    setSelectedListing(null);
  };

  const handleConfirmInvestment = async () => {
    if (!selectedListing) return;

    if (!isWalletConnected || !connected || !publicKey) {
      connectWallet();
      toast({
        title: t.connectWalletToastTitle,
        description: t.connectWalletToastDescription,
      });
      return;
    }

    // Auto-inicializar venta si no existe
    let activeSale = sales.find(s => s.account.active);

    if (!activeSale && !autoInitializing) {
      setAutoInitializing(true);

      try {
        toast({
          title: language === 'es' ? "Inicializando venta..." : "Initializing sale...",
          description: language === 'es'
            ? "Preparando la venta automáticamente. Espera un momento."
            : "Automatically preparing the sale. Please wait.",
        });

        const result = await initSale();

        if (result.success) {
          // Refrescar sales
          await fetchSales();
          activeSale = sales.find(s => s.account.active);

          toast({
            title: language === 'es' ? "Venta inicializada" : "Sale initialized",
            description: language === 'es'
              ? "La venta se ha inicializado correctamente. Intenta comprar de nuevo."
              : "Sale initialized successfully. Try purchasing again.",
          });
        } else {
          throw new Error(result.error || 'Failed to initialize sale');
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: language === 'es' ? "Error al inicializar venta" : "Error initializing sale",
          description: error.message || (language === 'es'
            ? "No se pudo inicializar la venta automáticamente."
            : "Could not initialize sale automatically."),
        });
      } finally {
        setAutoInitializing(false);
        setIsProcessing(false);
      }
      return;
    }

    if (!activeSale) {
      toast({
        variant: "destructive",
        title: language === 'es' ? "No hay ventas activas" : "No active sales",
        description: language === 'es'
          ? "No se pudo encontrar una venta activa. Intenta de nuevo."
          : "Could not find an active sale. Try again.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Calling buyPrimary with:', {
        saleAddress: activeSale.publicKey.toString(),
        amount: tokensToBuy,
        buyer: publicKey.toString()
      });

      // Llamar a la función buyPrimary del smart contract
      const result = await buyPrimary(activeSale.publicKey, tokensToBuy);

      if (!result.success) {
        throw new Error(result.error || 'Purchase failed');
      }

      console.log(`Investment successful! Signature: ${result.signature}`);

      // Transferir tokens automáticamente después del pago exitoso
      console.log('Transferring tokens to buyer...');
      try {
        const transferResponse = await fetch('/api/transfer-nft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyerAddress: publicKey.toString(),
            amount: tokensToBuy,
            signature: result.signature,
          }),
        });

        const transferData = await transferResponse.json();

        if (transferData.success) {
          console.log('✅ Tokens transferred successfully:', transferData);
        } else {
          console.error('❌ Token transfer failed:', transferData.error);
          toast({
            title: language === 'es' ? 'Pago exitoso, pero...' : 'Payment successful, but...',
            description: language === 'es'
              ? 'El pago se completó pero hubo un problema transfiriendo los tokens. Contacta soporte.'
              : 'Payment completed but there was an issue transferring tokens. Contact support.',
            variant: 'destructive',
            duration: 10000,
          });
        }
      } catch (transferError: any) {
        console.error('Error calling transfer API:', transferError);
      }

      // Guardar la compra en localStorage para referencia rápida
      const purchase = {
        id: `${selectedListing.id}-${Date.now()}`,
        name: selectedListing.name,
        series: selectedListing.name.replace('Opti-Freight ', ''),
        value: totalCost,
        tokens: tokensToBuy,
        purchaseDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + selectedListing.termYears * 365 * 24 * 60 * 60 * 1000).toISOString(),
        signature: result.signature,
        saleAddress: activeSale.publicKey.toString(),
        listing: selectedListing,
      };

      const existingPurchases = JSON.parse(localStorage.getItem('opti-freight-purchases') || '[]');
      existingPurchases.push(purchase);
      localStorage.setItem('opti-freight-purchases', JSON.stringify(existingPurchases));

      console.log('Purchase saved to localStorage:', purchase);

      // Refrescar la lista de ventas para actualizar el contador
      await fetchSales();

      toast({
        title: t.investmentSuccessTitle,
        description: t.investmentSuccessDescription(tokensToBuy, selectedListing.name),
        duration: 5000,
      });

      handleCloseBuyDialog();

    } catch (error: any) {
      console.error('Investment error:', error);
      toast({
        variant: "destructive",
        title: language === 'es' ? "Error en la transacción" : "Transaction Error",
        description: error.message || (language === 'es'
          ? "No se pudo completar la inversión. Verifica tu balance de USDC."
          : "Could not complete investment. Check your USDC balance."),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalCost = selectedListing ? tokensToBuy * selectedListing.tokenPrice : 0;
  const maxTokensToBuy = selectedListing ? Math.floor((selectedListing.totalValue - selectedListing.amountRaised) / selectedListing.tokenPrice) : 0;
  
  const handleBuyResale = (listing: any) => {
    if (!isWalletConnected) {
        connectWallet();
        toast({
            title: t.connectWalletToastTitle,
            description: "Por favor, conecta tu billetera para comprar tokens del mercado de reventa.",
        });
        return;
    }
    toast({
        title: t.buyResaleToastTitle,
        description: t.buyResaleToastDescription(listing.name),
    });
  }


  return (
    <>
      {!isWalletConnected && (
         <Alert className="mb-6 border-primary/50 bg-primary/10">
            <Wallet className="h-4 w-4" />
            <AlertTitle>{t.connectWalletTitle}</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              {t.connectWalletDescription}
              <Button onClick={connectWallet}>{t.connectWalletButton}</Button>
            </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="primary">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="primary">{t.primaryMarket}</TabsTrigger>
          <TabsTrigger value="resale">{t.resaleMarket}</TabsTrigger>
        </TabsList>

        <TabsContent value="primary">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
            {marketplaceListings.filter(listing => listing.active).map((listing) => {
              const tokensSold = (listing.amountRaised / listing.totalValue) * (listing.totalValue / listing.tokenPrice);
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
                      <div className="text-xs text-muted-foreground mt-1 text-right">{formatCurrency(listing.amountRaised)} {t.raised}</div>
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
                          <div className="font-semibold">{formatCurrency(listing.tokenPrice)}</div>
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
                      <TableHead className="text-right">{t.pricePerToken}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resaleListings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell>
                          <div className="font-medium">{listing.name}</div>
                          <div className="text-sm text-muted-foreground">{listing.series}</div>
                        </TableCell>
                        <TableCell>{listing.tokensAvailable}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-mono">{listing.seller}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(listing.pricePerToken)}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleBuyResale(listing)}>{t.buy}</Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
                <div className="col-span-3 font-semibold">{formatCurrency(selectedListing?.tokenPrice || 0)} / token</div>
             </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t.totalCost}</Label>
                <div className="col-span-3 text-lg font-bold text-primary">{formatCurrency(totalCost)} USDC</div>
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
