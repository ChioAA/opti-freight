/**
 * Program IDs for all Opti-Freight Solana programs
 * These match the declared IDs in the Rust contracts
 */

import { PublicKey } from '@solana/web3.js';

export const PROGRAM_IDS = {
  // Unified Program (RECOMMENDED - includes all functionality)
  OPTI_FREIGHT: new PublicKey('HAsA9cM5SRhGKNNrQy9c7JF3rCsGwRC6A5ycNbKxpnWU'),

  // Legacy Programs (for backwards compatibility)
  ASSET_NFT: new PublicKey('2ESdz2tgd6m8VPEcBnBPsndboKgMSDMQRUn94xD8YpUW'),
  PRIMARY_MARKET: new PublicKey('Az1M72qgA5REQjiV789DrSqgMG1UGrL7puRXEqBCAHFQ'),
  SECONDARY_MARKET: new PublicKey('SECNdNgfnX8e4Qb1XAJ7H5YphWE87XKmWrk3nkzD8Vz'),
  RETURNS_DISTRIBUTION: new PublicKey('DVfDdWLdsin4LGgor4B1nNQTSe4oi5F4cfmRVafpeMog'),
  GOVERNANCE: new PublicKey('GOVERNcaWJxH5YM3p8k6mwUhY7LzASwYxNzmgXzD4z'),
} as const;

export type ProgramId = keyof typeof PROGRAM_IDS;
