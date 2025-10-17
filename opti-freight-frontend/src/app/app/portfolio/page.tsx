
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Percent, TrendingUp, Wallet, Minus, Plus } from "lucide-react";
import { portfolioData, returnsHistoryData, type NFT } from "@/lib/data";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useWallet, useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/language-context";
import { format } from "date-fns";

const chartConfig = {
  returns: {
    label: "Returns (USD)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const PRIMARY_TOKEN_COST = 200;
const SALE_PENALTY_FEE = 50;
const MARKETPLACE_FEE_PERCENTAGE = 0.03;

const content = {
  en: {
    connectWalletTitle: "Connect Your Wallet",
    connectWalletDescription: "Please connect your wallet to view your portfolio and track your investment returns.",
    totalInvestment: "Total Investment",
    currentValue: "Current value of your portfolio",
    monthlyReturns: "Monthly Returns",
    fromLastMonth: (percentage: number) => `+${percentage}% from last month`,
    estimatedApy: "Estimated APY",
    basedOn12Months: "Based on 12-month returns",
    portfolioGrowth: "Portfolio Growth",
    totalRoi: "Total return on investment",
    returnsOverview: "Returns Overview",
    returnsDescription: "Your monthly returns in USD for the last 7 months.",
    depositHistory: "Deposit History",
    depositDescription: "Summary of monthly income received.",
    month: "Month",
    amount: "Amount",
    status: "Status",
    completed: "Completed",
    myTrailerTokens: "My Trailer Tokens",
    myTokensDescription: "Manage and sell your fractional ownership tokens. Your listings will appear on the Resale Market.",
    asset: "Asset",
    series: "Series",
    purchaseDate: "Purchase Date",
    expiryDate: "Expiry Date",
    valueOwned: "Value Owned",
    actions: "Actions",
    sell: "Sell",
    sellTokensTitle: (name: string) => `Sell Tokens from ${name}`,
    sellTokensDescription: (price: string) => `Select the number of tokens to list and set your price. Minimum price is ${price}.`,
    tokensToSell: "Tokens to Sell",
    tokensOwned: "Tokens Owned",
    pricePerToken: "Price / Token",
    transactionBreakdown: "Transaction Breakdown",
    totalSaleValue: (tokens: number, price: string) => `Total Sale Value (${tokens} x ${price})`,
    earlySalePenalty: "Early Sale Penalty",
    marketplaceFee: (percentage: number) => `Marketplace Fee (${percentage}%)`,
    yourNetProceeds: "Your Net Proceeds",
    cancel: "Cancel",
    confirmSale: "Confirm Sale",
    invalidPriceToast: "Invalid Price",
    minPriceToast: (price: string) => `Minimum selling price is ${price}.`,
    connectWalletToast: "Connect your wallet",
    connectWalletToSellToast: "Please connect your wallet to sell your tokens, then click 'Confirm' again.",
    saleListedToast: "Sale Listed!",
    saleListedDescription: (tokens: number, name: string) => `Your sale of ${tokens} token(s) of ${name} is now on the resale market.`
  },
  es: {
    connectWalletTitle: "Conecta tu Billetera",
    connectWalletDescription: "Por favor, conecta tu billetera para ver tu portafolio y seguir tus retornos de inversión.",
    totalInvestment: "Inversión Total",
    currentValue: "Valor actual de tu portafolio",
    monthlyReturns: "Retornos Mensuales",
    fromLastMonth: (percentage: number) => `+${percentage}% desde el mes pasado`,
    estimatedApy: "APY Estimado",
    basedOn12Months: "Basado en retornos de 12 meses",
    portfolioGrowth: "Crecimiento del Portafolio",
    totalRoi: "Retorno total de la inversión",
    returnsOverview: "Resumen de Rendimientos",
    returnsDescription: "Tus rendimientos mensuales en USD durante los últimos 7 meses.",
    depositHistory: "Historial de Depósitos",
    depositDescription: "Resumen de los ingresos mensuales recibidos.",
    month: "Mes",
    amount: "Monto",
    status: "Estado",
    completed: "Completado",
    myTrailerTokens: "Mis Tokens de Tráiler",
    myTokensDescription: "Administra y vende tus tokens de propiedad fraccional. Tus listados aparecerán en el Mercado de Reventa.",
    asset: "Activo",
    series: "Serie",
    purchaseDate: "Fecha de Compra",
    expiryDate: "Fecha de Vencimiento",
    valueOwned: "Valor Poseído",
    actions: "Acciones",
    sell: "Vender",
    sellTokensTitle: (name: string) => `Vender Tokens de ${name}`,
    sellTokensDescription: (price: string) => `Selecciona la cantidad de tokens a listar y establece tu precio. El precio mínimo es ${price}.`,
    tokensToSell: "Tokens a Vender",
    tokensOwned: "Tokens Poseídos",
    pricePerToken: "Precio / Token",
    transactionBreakdown: "Desglose de la Transacción",
    totalSaleValue: (tokens: number, price: string) => `Valor Total de Venta (${tokens} x ${price})`,
    earlySalePenalty: "Penalización por Venta Anticipada",
    marketplaceFee: (percentage: number) => `Comisión del Marketplace (${percentage}%)`,
    yourNetProceeds: "Tus Ganancias Netas",
    cancel: "Cancelar",
    confirmSale: "Confirmar Venta",
    invalidPriceToast: "Precio Inválido",
    minPriceToast: (price: string) => `El precio mínimo de venta es ${price}.`,
    connectWalletToast: "Conecta tu billetera",
    connectWalletToSellToast: "Por favor, conecta tu billetera para vender tus tokens, luego haz clic en 'Confirmar' de nuevo.",
    saleListedToast: "¡Venta Listada!",
    saleListedDescription: (tokens: number, name: string) => `Tu venta de ${tokens} token(s) de ${name} está ahora en el mercado de reventa.`
  }
};


export default function PortfolioPage() {
  const { isWalletConnected, connectWallet } = useWallet();
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = content[language];

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [tokensToSell, setTokensToSell] = useState(1);
  const [sellPrice, setSellPrice] = useState(250);
  const [userNfts, setUserNfts] = useState<NFT[]>([]);
  const [totalInvestment, setTotalInvestment] = useState(0);

  // Cargar compras del localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const purchases = JSON.parse(localStorage.getItem('opti-freight-purchases') || '[]');

      // Convertir compras a formato NFT
      const nfts: NFT[] = purchases.map((purchase: any) => ({
        id: purchase.id,
        name: purchase.name,
        series: purchase.listing?.name?.replace('Opti-Freight ', '') || purchase.series,
        value: purchase.value,
        purchaseDate: format(new Date(purchase.purchaseDate), 'MMM d, yyyy'),
        expiryDate: format(new Date(purchase.expiryDate), 'MMM d, yyyy'),
      }));

      setUserNfts(nfts);

      // Calcular inversión total
      const total = purchases.reduce((sum: number, p: any) => sum + p.value, 0);
      setTotalInvestment(total);
    }
  }, [isWalletConnected]);

  const { monthlyReturn, apy } = portfolioData;

  const handleSellClick = (nft: NFT) => {
    setSelectedNft(nft);
    setTokensToSell(1);
    setSellPrice(250);
  };

  const handleCloseSellDialog = () => {
    setSelectedNft(null);
  };

  const handleConfirmSale = () => {
    if (!selectedNft) return;
    
    if (sellPrice < 250) {
      toast({
        variant: "destructive",
        title: t.invalidPriceToast,
        description: t.minPriceToast(formatCurrency(250)),
      });
      return;
    }
    
    if (!isWalletConnected) {
      connectWallet();
      toast({
        title: t.connectWalletToast,
        description: t.connectWalletToSellToast,
      });
      return;
    }

    console.log(`Selling ${tokensToSell} tokens from ${selectedNft.name} at ${formatCurrency(sellPrice)} each.`);
    
    toast({
      title: t.saleListedToast,
      description: t.saleListedDescription(tokensToSell, selectedNft.name),
      duration: 5000,
    });
    
    handleCloseSellDialog();
  };
  
  const tokensOwned = selectedNft ? Math.floor(selectedNft.value / PRIMARY_TOKEN_COST) : 0; 
  const totalSaleValue = selectedNft ? tokensToSell * sellPrice : 0;
  
  const profitPerToken = sellPrice - PRIMARY_TOKEN_COST;
  const totalProfit = profitPerToken * tokensToSell;
  
  const profitAfterPenalty = totalProfit - SALE_PENALTY_FEE;
  
  const marketplaceFee = profitAfterPenalty > 0 ? profitAfterPenalty * MARKETPLACE_FEE_PERCENTAGE : 0;
  
  const netProceeds = totalSaleValue - SALE_PENALTY_FEE - marketplaceFee;


  if (!user) {
      return null;
  }

  if (!isWalletConnected) {
    return (
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
            <Wallet className="w-16 h-16 text-white" />
            <h3 className="text-2xl font-bold tracking-tight text-white">{t.connectWalletTitle}</h3>
            <p className="text-neutral-300 max-w-sm">
              {t.connectWalletDescription}
            </p>
            <Button className="mt-4" onClick={connectWallet}>
              {language === 'es' ? 'Conectar Billetera' : 'Connect Wallet'}
            </Button>
          </div>
        </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.totalInvestment}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvestment)}</div>
              <p className="text-xs text-muted-foreground">{t.currentValue}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.monthlyReturns}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthlyReturn)}</div>
              <p className="text-xs text-muted-foreground">{t.fromLastMonth(1.6)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.estimatedApy}</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apy}%</div>
              <p className="text-xs text-muted-foreground">{t.basedOn12Months}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.portfolioGrowth}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+15.3%</div>
              <p className="text-xs text-muted-foreground">{t.totalRoi}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{t.returnsOverview}</CardTitle>
              <CardDescription>{t.returnsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart accessibilityLayer data={returnsHistoryData} margin={{ left: -20, top: 10 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis tickFormatter={(value) => `$${value}`} tickLine={false} tickMargin={10} axisLine={false} width={80} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="returns" fill="var(--color-returns)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t.depositHistory}</CardTitle>
              <CardDescription>{t.depositDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.month}</TableHead>
                    <TableHead className="text-right">{t.amount}</TableHead>
                    <TableHead className="text-center">{t.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnsHistoryData.slice(0, 5).reverse().map((deposit) => (
                    <TableRow key={deposit.month}>
                      <TableCell className="font-medium">{deposit.month}, 2024</TableCell>
                      <TableCell className="text-right">{formatCurrency(deposit.returns)}</TableCell>
                      <TableCell className="text-center"><Badge variant="default" className="bg-green-600">{t.completed}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>


          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>{t.myTrailerTokens}</CardTitle>
              <CardDescription>{t.myTokensDescription}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.asset}</TableHead>
                      <TableHead>{t.series}</TableHead>
                      <TableHead>{t.purchaseDate}</TableHead>
                      <TableHead>{t.expiryDate}</TableHead>
                      <TableHead className="text-right">{t.valueOwned}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userNfts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {language === 'es' ? 'No tienes tokens aún. Ve al Marketplace para invertir.' : 'No tokens yet. Go to Marketplace to invest.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      userNfts.map((nft) => (
                        <TableRow key={nft.id}>
                          <TableCell className="font-medium">{nft.name}</TableCell>
                          <TableCell><Badge variant="secondary">{nft.series}</Badge></TableCell>
                          <TableCell>{nft.purchaseDate}</TableCell>
                          <TableCell>{nft.expiryDate}</TableCell>
                          <TableCell className="text-right">{formatCurrency(nft.value)}</TableCell>
                          <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => handleSellClick(nft)}>{t.sell}</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      
       <Dialog open={!!selectedNft} onOpenChange={(isOpen) => !isOpen && handleCloseSellDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.sellTokensTitle(selectedNft?.name || '')}</DialogTitle>
            <DialogDescription>
              {t.sellTokensDescription(formatCurrency(250))}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="tokens-sell">
                {t.tokensToSell}
              </Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTokensToSell(p => Math.max(1, p-1))}><Minus className="h-4 w-4" /></Button>
                <Input
                  id="tokens-sell"
                  type="number"
                  value={tokensToSell}
                  onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0 && value <= tokensOwned) {
                          setTokensToSell(value);
                      } else if (e.target.value === '') {
                        setTokensToSell(1);
                      }
                  }}
                  className="h-8 text-center"
                  min="1"
                  max={tokensOwned}
                />
                 <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTokensToSell(p => Math.min(tokensOwned, p + 1))}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
             <div className="grid grid-cols-2 items-center gap-4">
                <Label>{t.tokensOwned}</Label>
                <div className="text-sm text-muted-foreground text-right">{tokensOwned} tokens</div>
             </div>
             <div className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor="price-sell">
                  {t.pricePerToken}
                </Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSellPrice(p => Math.max(250, p - 1))}><Minus className="h-4 w-4" /></Button>
                  <Input
                    id="price-sell"
                    type="number"
                    value={sellPrice}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setSellPrice(value);
                      }
                    }}
                    onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (isNaN(value) || value < 250) {
                            setSellPrice(250);
                        }
                    }}
                    className="h-8 text-center"
                    min="250"
                    step="1"
                    placeholder="ej. 250"
                  />
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSellPrice(p => p + 1)}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
          </div>
          <Separator />
          <div className="grid gap-2 text-sm">
            <DialogTitle className="text-base">{t.transactionBreakdown}</DialogTitle>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.totalSaleValue(tokensToSell, formatCurrency(sellPrice))}</span>
              <span>{formatCurrency(totalSaleValue)}</span>
            </div>
             <div className="flex justify-between text-destructive">
              <span >{t.earlySalePenalty}</span>
              <span>- {formatCurrency(SALE_PENALTY_FEE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.marketplaceFee(MARKETPLACE_FEE_PERCENTAGE*100)}</span>
              <span>- {formatCurrency(marketplaceFee)}</span>
            </div>
            <Separator />
             <div className="flex justify-between font-bold text-lg">
              <span>{t.yourNetProceeds}</span>
              <span className="text-primary">{formatCurrency(netProceeds)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSellDialog}>{t.cancel}</Button>
            <Button onClick={handleConfirmSale}>{t.confirmSale}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
