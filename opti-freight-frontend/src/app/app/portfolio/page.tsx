
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Percent, TrendingUp, Wallet, Minus, Plus } from "lucide-react";
import { portfolioData, returnsHistoryData, type NFT } from "@/lib/data";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useAuth } from "@/contexts/auth-context";
import { useSolanaWallet } from "@/hooks/use-solana-wallet";
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
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { useSecondaryMarket } from "@/hooks/use-secondary-market";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import secondaryMarketIdl from '@/lib/anchor/idl/secondary_market.json';

const chartConfig = {
  returns: {
    label: "Returns (SOL)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const PRIMARY_TOKEN_COST = 0.12; // SOL por token (costo original del NFT)
const SALE_PENALTY_FEE = 0.025; // SOL penalización por venta anticipada
const MARKETPLACE_FEE_PERCENTAGE = 0.03; // 3% fee del marketplace

// Calcular precio mínimo: (Costo + Penalización) / (1 - Fee)
// Para cubrir costos + penalización + fee del 3%
const MINIMUM_SALE_PRICE = (PRIMARY_TOKEN_COST + SALE_PENALTY_FEE) / (1 - MARKETPLACE_FEE_PERCENTAGE);

// Token mint addresses
const OPTIFREIGHT_SERIE1_MINT = "9Y2hkFT7Gtb6rJQSJJMxHw7m5VeGFZVoJvxgGRjKzBsQ";
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com";

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
    returnsDescription: "Your monthly returns in SOL for the last 7 months.",
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
    mintAddress: "Mint Address",
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
    returnsDescription: "Tus rendimientos mensuales en SOL durante los últimos 7 meses.",
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
    mintAddress: "Dirección Mint",
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
  const { connected, publicKey, connectWallet } = useSolanaWallet(); // Usar TODO desde el mismo hook
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = content[language];

  const formatSOL = (value: number) => `${value.toFixed(2)} SOL`;

  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [tokensToSell, setTokensToSell] = useState(1);
  const [sellPrice, setSellPrice] = useState(MINIMUM_SALE_PRICE);
  const [userNfts, setUserNfts] = useState<NFT[]>([]);
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Listener para detectar cuando Phantom se conecta desde otro componente
  useEffect(() => {
    if (typeof window !== 'undefined' && window.solana) {
      const handleConnect = () => {
        console.log('📡 Portfolio detectó conexión de wallet');
        setForceUpdate(prev => prev + 1); // Forzar re-render
      };

      window.solana.on('connect', handleConnect);
      return () => {
        window.solana?.off('connect', handleConnect);
      };
    }
  }, []);

  // Hook del mercado secundario
  const { createListing, getListing, cancelListing } = useSecondaryMarket();
  const [nftListings, setNftListings] = useState<Map<string, boolean>>(new Map());

  // Cargar NFTs directamente desde la blockchain
  useEffect(() => {
    const loadNFTsFromBlockchain = async () => {
      console.log('🔍 Portfolio: Verificando wallet...', {
        connected,
        publicKey: publicKey?.toString(),
      });

      // Usar la wallet de Solana directamente
      if (!connected || !publicKey) {
        console.log('⚠️ Wallet no conectada, no se cargan NFTs');
        setUserNfts([]);
        setTotalInvestment(0);
        return;
      }

      setIsLoadingTokens(true);
      try {
        const connection = new Connection(SOLANA_RPC, 'confirmed');

        console.log('🔍 Buscando NFTs en la wallet:', publicKey.toString());

        // Obtener todas las cuentas de token del usuario
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });

        console.log('📦 Token accounts encontradas:', tokenAccounts.value.length);

        // Filtrar solo NFTs (tokens con 0 decimales y balance = 1)
        const nfts: NFT[] = [];
        let totalValue = 0;

        for (const { account } of tokenAccounts.value) {
          const parsedInfo = account.data.parsed.info;
          const decimals = parsedInfo.tokenAmount.decimals;
          const balance = parsedInfo.tokenAmount.uiAmount;

          console.log('🔍 Verificando token:');
          console.log('  - Mint:', parsedInfo.mint);
          console.log('  - Decimals:', decimals, '(tipo:', typeof decimals, ')');
          console.log('  - Balance:', balance, '(tipo:', typeof balance, ')');
          console.log('  - Es NFT?:', decimals === 0 && balance === 1);

          // NFTs tienen 0 decimales y balance de 1
          if (decimals === 0 && balance === 1) {
            const mintAddress = parsedInfo.mint;
            console.log('🎨 NFT encontrado:', mintAddress);

            // Buscar info de este NFT en localStorage (para metadata)
            const purchasesStr = localStorage.getItem('opti-freight-purchases');
            let purchaseInfo = null;
            if (purchasesStr) {
              const allPurchases = JSON.parse(purchasesStr);
              purchaseInfo = allPurchases.find((p: any) => p.nftMintAddress === mintAddress);
            }

            // Crear entry del NFT
            let purchaseDate = new Date();
            if (purchaseInfo?.timestamp) {
              const tempDate = new Date(purchaseInfo.timestamp);
              if (!isNaN(tempDate.getTime())) {
                purchaseDate = tempDate;
              }
            }

            const expiryDate = new Date(purchaseDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + 5);

            const value = purchaseInfo?.value || 0.12; // Default 0.12 SOL

            nfts.push({
              id: mintAddress.slice(0, 8),
              name: purchaseInfo?.name || 'OptiFreight NFT',
              series: purchaseInfo?.series || 'Serie 1',
              value: value,
              purchaseDate: format(purchaseDate, 'MMM d, yyyy'),
              expiryDate: format(expiryDate, 'MMM d, yyyy'),
              mintAddress: mintAddress, // Dirección completa del NFT
            });

            totalValue += value;
          }
        }

        // Agregar NFTs que están en listings activos (en escrow)
        // Estos NFTs ya no están en la wallet pero siguen siendo del usuario
        try {
          const connection = new Connection(SOLANA_RPC, 'confirmed');
          const provider = new AnchorProvider(connection, { publicKey } as any, { commitment: 'confirmed' });
          const program = new Program(secondaryMarketIdl as any, provider) as any;

          // Obtener todos los listings del usuario
          const allListings = await program.account.listing.all([
            {
              memcmp: {
                offset: 8, // Después del discriminator
                bytes: publicKey.toBase58(),
              }
            }
          ]);

          // Agregar NFTs de listings activos que no están ya en la lista
          for (const { account } of allListings) {
            const listingData = account as any;
            if (listingData.active) {
              const mintAddress = listingData.nftMint.toString();

              // Solo agregar si no está ya en la lista (no está en wallet)
              const alreadyInList = nfts.some(nft => nft.mintAddress === mintAddress);
              if (!alreadyInList) {
                // Buscar info de este NFT en localStorage
                const purchasesStr = localStorage.getItem('opti-freight-purchases');
                let purchaseInfo = null;
                if (purchasesStr) {
                  const allPurchases = JSON.parse(purchasesStr);
                  purchaseInfo = allPurchases.find((p: any) => p.nftMintAddress === mintAddress);
                }

                const purchaseDate = listingData.purchaseDate
                  ? new Date(Number(listingData.purchaseDate) * 1000)
                  : new Date();
                const expiryDate = new Date(purchaseDate);
                expiryDate.setFullYear(expiryDate.getFullYear() + 5);
                const value = purchaseInfo?.value || 0.12;

                nfts.push({
                  id: mintAddress.slice(0, 8),
                  name: purchaseInfo?.name || 'OptiFreight NFT',
                  series: purchaseInfo?.series || 'Serie 1',
                  value: value,
                  purchaseDate: format(purchaseDate, 'MMM d, yyyy'),
                  expiryDate: format(expiryDate, 'MMM d, yyyy'),
                  mintAddress: mintAddress,
                });

                totalValue += value;
              }
            }
          }
        } catch (error) {
          console.error('Error loading NFTs from listings:', error);
        }

        console.log('✅ NFTs cargados desde blockchain:', nfts.length, 'Total:', totalValue, 'SOL');
        setUserNfts(nfts);
        setTotalInvestment(totalValue);
      } catch (error) {
        console.error('Error loading NFTs from blockchain:', error);
        setUserNfts([]);
        setTotalInvestment(0);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    loadNFTsFromBlockchain();
  }, [connected, publicKey, refreshTrigger]);

  // Verificar qué NFTs tienen listings activos
  useEffect(() => {
    const checkListings = async () => {
      if (!connected || !publicKey || userNfts.length === 0) return;

      const listingsMap = new Map<string, boolean>();

      for (const nft of userNfts) {
        if (nft.mintAddress) {
          try {
            const nftMintPubkey = new PublicKey(nft.mintAddress);
            const listing = await getListing(nftMintPubkey);
            listingsMap.set(nft.mintAddress, listing !== null && listing.active);
          } catch (error) {
            listingsMap.set(nft.mintAddress, false);
          }
        }
      }

      setNftListings(listingsMap);
    };

    checkListings();
  }, [userNfts, connected, publicKey, getListing]);

  const { monthlyReturn, apy } = portfolioData;

  const handleSellClick = (nft: NFT) => {
    setSelectedNft(nft);
    setTokensToSell(1);
    setSellPrice(MINIMUM_SALE_PRICE);
  };

  const handleCloseSellDialog = () => {
    setSelectedNft(null);
  };

  const handleCancelListing = async (nft: NFT) => {
    if (!connected || !publicKey) {
      connectSolanaWallet();
      return;
    }

    if (!nft.mintAddress) return;

    setIsProcessingSale(true);
    try {
      const nftMintPubkey = new PublicKey(nft.mintAddress);

      // Derivar el PDA del listing
      const [listingPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), publicKey.toBuffer(), nftMintPubkey.toBuffer()],
        new PublicKey('DakwaYqG3tV9Jjgy5GokyQJd3JWb74Qx66JHqbZicsZX') // Program ID del secondary-market
      );

      const result = await cancelListing(listingPDA, nftMintPubkey, publicKey!);

      if (result.success) {
        toast({
          title: language === 'es' ? 'Listing Cancelado' : 'Listing Cancelled',
          description: language === 'es'
            ? 'Tu NFT ha sido removido del marketplace y devuelto a tu wallet.'
            : 'Your NFT has been removed from the marketplace and returned to your wallet.',
          duration: 7000,
        });

        // Recargar para actualizar el estado
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || 'Error cancelando listing');
      }
    } catch (error: any) {
      console.error('Error canceling listing:', error);
      toast({
        variant: "destructive",
        title: language === 'es' ? 'Error' : 'Error',
        description: error.message || (language === 'es'
          ? 'No se pudo cancelar el listing. Verifica tu wallet.'
          : 'Could not cancel listing. Check your wallet.'),
        duration: 7000,
      });
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleConfirmSale = async () => {
    if (!selectedNft) return;

    // Validar precio mínimo
    if (sellPrice < MINIMUM_SALE_PRICE) {
      toast({
        variant: "destructive",
        title: t.invalidPriceToast,
        description: t.minPriceToast(formatSOL(MINIMUM_SALE_PRICE)),
      });
      return;
    }

    // Validar wallet conectada
    if (!connected || !publicKey) {
      connectSolanaWallet();
      toast({
        title: t.connectWalletToast,
        description: t.connectWalletToSellToast,
      });
      return;
    }

    setIsProcessingSale(true);

    try {
      console.log(`📝 Listando ${selectedNft.name} a ${formatSOL(sellPrice)} SOL`);

      // Obtener la fecha de compra del NFT desde localStorage
      const purchasesStr = localStorage.getItem('opti-freight-purchases');
      let purchaseDate = new Date(); // Default a ahora si no se encuentra

      if (purchasesStr) {
        const purchases = JSON.parse(purchasesStr);
        const purchase = purchases.find((p: any) => p.nftMintAddress === selectedNft.mintAddress);
        if (purchase && purchase.timestamp) {
          purchaseDate = new Date(purchase.timestamp);
        }
      }

      // Verificar si ya existe un listing activo para este NFT
      if (!selectedNft.mintAddress) {
        toast({
          variant: "destructive",
          title: language === 'es' ? 'Error' : 'Error',
          description: language === 'es' ? 'Dirección mint del NFT no encontrada' : 'NFT mint address not found',
          duration: 5000,
        });
        setIsProcessingSale(false);
        return;
      }
      const nftMintPubkey = new PublicKey(selectedNft.mintAddress);
      const existingListing = await getListing(nftMintPubkey);

      if (existingListing) {
        toast({
          variant: "destructive",
          title: language === 'es' ? 'NFT Ya Listado' : 'NFT Already Listed',
          description: language === 'es'
            ? 'Este NFT ya está en venta en el marketplace.'
            : 'This NFT is already listed for sale in the marketplace.',
          duration: 7000,
        });
        setIsProcessingSale(false);
        return;
      }

      // Crear listing en el contrato
      const result = await createListing(nftMintPubkey, sellPrice, purchaseDate, publicKey!);

      if (result.success) {
        toast({
          title: t.saleListedToast,
          description: t.saleListedDescription(tokensToSell, selectedNft.name),
          duration: 10000, // Aumentado a 10 segundos para que se vea antes del reload
        });

        console.log('✅ Listing creado exitosamente:', result.signature);
        handleCloseSellDialog();

        // Recargar NFTs para actualizar el estado (aumentado a 4 segundos para que se vea el toast)
        setTimeout(() => {
          window.location.reload();
        }, 4000);
      } else {
        throw new Error(result.error || 'Error creando listing');
      }

    } catch (error: any) {
      console.error('Error listing NFT:', error);
      toast({
        variant: "destructive",
        title: language === 'es' ? 'Error' : 'Error',
        description: error.message || (language === 'es'
          ? 'No se pudo crear el listing. Verifica tu wallet.'
          : 'Could not create listing. Check your wallet.'),
        duration: 7000,
      });
    } finally {
      setIsProcessingSale(false);
    }
  };
  
  const tokensOwned = selectedNft ? Math.floor(selectedNft.value / PRIMARY_TOKEN_COST) : 0;
  const totalSaleValue = selectedNft ? tokensToSell * sellPrice : 0;

  // Cálculo correcto según el contrato:
  // 1. Precio total de venta
  const priceAfterPenalty = totalSaleValue - SALE_PENALTY_FEE; // Se resta la penalización de 0.25 SOL

  // 2. Fee del marketplace (3% del precio después de penalización)
  const marketplaceFee = priceAfterPenalty > 0 ? priceAfterPenalty * MARKETPLACE_FEE_PERCENTAGE : 0;

  // 3. Ganancias netas del vendedor
  const netProceeds = priceAfterPenalty - marketplaceFee;


  if (!user) {
      return null;
  }

  // Debug: ver estado de conexión
  const shouldShowConnect = !connected || !publicKey;

  console.log('🔍 Estado de wallet en Portfolio:', {
    connected,
    publicKey: publicKey?.toString(),
    hasPublicKey: !!publicKey,
    shouldShowConnect,
    notConnected: !connected,
    noPublicKey: !publicKey
  });

  // Mostrar pantalla de "Conectar Billetera" solo si NO está conectada la wallet de Solana
  // Verificamos tanto 'connected' como 'publicKey' para asegurar que la wallet esté realmente conectada
  if (shouldShowConnect) {
    console.log('✅ Renderizando pantalla de CONECTAR WALLET');
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
            <Button
              className="mt-4"
              onClick={() => {
                console.log('🔗 Llamando a connectWallet() del hook');
                connectWallet();
              }}
            >
              {language === 'es' ? 'Conectar Billetera' : 'Connect Wallet'}
            </Button>
          </div>
        </div>
    )
  }

  // Si la wallet está conectada, mostrar el portfolio completo (aunque esté vacío)
  console.log('✅ Renderizando DASHBOARD completo - wallet conectada');
  return (
    <>
      {/* Saludo con wallet conectada */}
      {publicKey && user && (
        <div className="mb-4 p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">
            Hola <span className="font-semibold text-foreground">{user.nickname}</span>, Wallet conectada: <span className="font-mono text-green-500">{publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</span>
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.totalInvestment}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatSOL(totalInvestment)}</div>
              <p className="text-xs text-muted-foreground">{t.currentValue}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.monthlyReturns}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatSOL(monthlyReturn)}</div>
              <p className="text-xs text-muted-foreground">{t.fromLastMonth(1.4)}</p>
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
              <div className="text-2xl font-bold">+7.8%</div>
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
                  <YAxis tickFormatter={(value) => `${value} SOL`} tickLine={false} tickMargin={10} axisLine={false} width={80} />
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
                      <TableCell className="text-right">{formatSOL(deposit.returns)}</TableCell>
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
                      <TableHead>{t.mintAddress}</TableHead>
                      <TableHead className="text-right">{t.valueOwned}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTokens ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {language === 'es' ? 'Cargando tokens desde blockchain...' : 'Loading tokens from blockchain...'}
                        </TableCell>
                      </TableRow>
                    ) : userNfts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {language === 'es' ? 'No tienes tokens aún. Ve al Marketplace para invertir.' : 'No tokens yet. Go to Marketplace to invest.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      userNfts.map((nft) => {
                        const hasActiveListing = nft.mintAddress ? nftListings.get(nft.mintAddress) || false : false;

                        return (
                          <TableRow key={nft.id}>
                            <TableCell className="font-medium">
                              {nft.name}
                              {hasActiveListing && (
                                <Badge variant="default" className="ml-2 bg-green-600">
                                  {language === 'es' ? 'En Venta' : 'Listed'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell><Badge variant="secondary">{nft.series}</Badge></TableCell>
                            <TableCell>{nft.purchaseDate}</TableCell>
                            <TableCell>{nft.expiryDate}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {nft.mintAddress ? (
                                <a
                                  href={`https://explorer.solana.com/address/${nft.mintAddress}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {nft.mintAddress.slice(0, 4)}...{nft.mintAddress.slice(-4)}
                                </a>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">{formatSOL(nft.value)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSellClick(nft)}
                                  disabled={hasActiveListing || isProcessingSale}
                                >
                                  {t.sell}
                                </Button>
                                {hasActiveListing && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleCancelListing(nft)}
                                    disabled={isProcessingSale}
                                  >
                                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
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
              {t.sellTokensDescription(formatSOL(1.45))}
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
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSellPrice(p => Math.max(MINIMUM_SALE_PRICE, p - 0.01))}><Minus className="h-4 w-4" /></Button>
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
                        if (isNaN(value) || value < MINIMUM_SALE_PRICE) {
                            setSellPrice(MINIMUM_SALE_PRICE);
                        }
                    }}
                    className="h-8 text-center"
                    min={MINIMUM_SALE_PRICE.toFixed(2)}
                    step="0.01"
                    placeholder={`ej. ${MINIMUM_SALE_PRICE.toFixed(2)}`}
                  />
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSellPrice(p => p + 0.01)}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
          </div>
          <Separator />
          <div className="grid gap-2 text-sm">
            <DialogTitle className="text-base">{t.transactionBreakdown}</DialogTitle>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.totalSaleValue(tokensToSell, formatSOL(sellPrice))}</span>
              <span>{formatSOL(totalSaleValue)}</span>
            </div>
             <div className="flex justify-between text-destructive">
              <span >{t.earlySalePenalty}</span>
              <span>- {formatSOL(SALE_PENALTY_FEE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.marketplaceFee(MARKETPLACE_FEE_PERCENTAGE*100)}</span>
              <span>- {formatSOL(marketplaceFee)}</span>
            </div>
            <Separator />
             <div className="flex justify-between font-bold text-lg">
              <span>{t.yourNetProceeds}</span>
              <span className="text-primary">{formatSOL(netProceeds)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSellDialog} disabled={isProcessingSale}>{t.cancel}</Button>
            <Button onClick={handleConfirmSale} disabled={isProcessingSale}>
              {isProcessingSale ? (language === 'es' ? 'Procesando...' : 'Processing...') : t.confirmSale}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
