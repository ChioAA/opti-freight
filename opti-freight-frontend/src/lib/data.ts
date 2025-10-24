
import { addYears, format } from 'date-fns';

export type NFT = {
  id: string;
  name: string;
  series: string;
  value: number;
  purchaseDate: string;
  expiryDate: string;
  mintAddress?: string; // Dirección del NFT en Solana blockchain
};

// --- Helpers to generate dynamic dates ---
const today = new Date();
const portfolioPurchaseDate1 = new Date('2023-01-15');
const portfolioPurchaseDate2 = new Date('2023-02-20');

export const portfolioData = {
  totalInvestment: 120, // en SOL (100 NFTs x 1.2 SOL)
  monthlyReturn: 0.021, // en SOL
  apy: 17.0,
  nfts: [
    {
      id: 'TKN001',
      name: 'Opti-Freight 001',
      series: 'Volvo VNL 860',
      value: 48, // 40 NFTs x 1.2 SOL
      purchaseDate: format(portfolioPurchaseDate1, 'MMM d, yyyy'),
      expiryDate: format(addYears(portfolioPurchaseDate1, 5), 'MMM d, yyyy'),
    },
    {
      id: 'TKN002',
      name: 'Opti-Freight 002',
      series: 'Freightliner Cascadia',
      value: 72, // 60 NFTs x 1.2 SOL
      purchaseDate: format(portfolioPurchaseDate2, 'MMM d, yyyy'),
      expiryDate: format(addYears(portfolioPurchaseDate2, 5), 'MMM d, yyyy'),
    },
  ],
};

export const returnsHistoryData = [
  { month: 'Ene', returns: 0.018 }, // en SOL
  { month: 'Feb', returns: 0.023 },
  { month: 'Mar', returns: 0.019 },
  { month: 'Abr', returns: 0.022 },
  { month: 'May', returns: 0.024 },
  { month: 'Jun', returns: 0.020 },
  { month: 'Jul', returns: 0.021 },
];

export type MarketplaceListing = {
    id: string;
    name: string;
    descriptionKey: 'serie1Description' | 'serie2Description' | 'serie3Description';
    totalValue: number;
    amountRaised: number;
    tokenPrice: number;
    apy: number;
    imageId: string;
    termYears: number;
    tokenMint?: string; // Dirección del token mint (opcional para series futuras)
    active: boolean; // Si está activa y disponible para compra
};

export const marketplaceListings: MarketplaceListing[] = [
  {
    id: 'VNL-860-01',
    name: 'Opti-Freight Serie 1',
    descriptionKey: 'serie1Description',
    totalValue: 120, // PARA PRUEBAS // 1000 tokens x 1.2 SOL
    amountRaised: 0, // Empezamos en 0, se actualiza con ventas reales
    tokenPrice: 0.12, // PARA PRUEBAS // SOL por token
    apy: 17.0,
    imageId: 'trailer-1',
    termYears: 5,
    tokenMint: '9Y2hkFT7Gtb6rJQSJJMxHw7m5VeGFZVoJvxgGRjKzBsQ',
    active: true, // Solo Serie 1 está activa
  },
  {
    id: 'CASCADIA-01',
    name: 'Opti-Freight Serie 2',
    descriptionKey: 'serie2Description',
    totalValue: 120, // PARA PRUEBAS // 1000 tokens x 1.2 SOL
    amountRaised: 0,
    tokenPrice: 0.12, // PARA PRUEBAS // SOL por token
    apy: 20.1,
    imageId: 'trailer-2',
    termYears: 5,
    tokenMint: undefined, // Aún no minteada
    active: false, // Se activará cuando Serie 1 se agote
  },
  {
    id: 'KW-T680-01',
    name: 'Opti-Freight Serie 3',
    descriptionKey: 'serie3Description',
    totalValue: 120, // PARA PRUEBAS // 1000 tokens x 1.2 SOL
    amountRaised: 0,
    tokenPrice: 0.12, // PARA PRUEBAS // SOL por token
    apy: 17.2,
    imageId: 'trailer-4',
    termYears: 5,
    tokenMint: undefined, // Aún no minteada
    active: false, // Se activará cuando Serie 2 se agote
  },
];

    
