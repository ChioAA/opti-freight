/**
 * TypeScript types for Opti-Freight Anchor programs
 * These types mirror the on-chain account structures
 */

import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// ============= PRIMARY MARKET TYPES =============
export interface Sale {
  authority: PublicKey;
  price: BN;
  total: number;
  sold: number;
  active: boolean;
  bump: number;
}

// ============= SECONDARY MARKET TYPES =============
export interface Listing {
  seller: PublicKey;
  price: BN;
  amount: number;
  active: boolean;
  bump: number;
}

// ============= ASSET NFT TYPES =============
export interface TrailerAsset {
  authority: PublicKey;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  series: string;
  totalValue: BN;
  tokenPrice: BN;
  totalTokens: number;
  tokensSold: number;
  apy: number;
  termYears: number;
  isLocked: boolean;
  createdAt: BN;
  expiryAt: BN;
  bump: number;
}

// ============= RETURNS DISTRIBUTION TYPES =============
export interface Pool {
  authority: PublicKey;
  apy: number;
  total: BN;
  bump: number;
}

// ============= SHARED TYPES =============
export interface ProgramAccount<T> {
  publicKey: PublicKey;
  account: T;
}

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}
