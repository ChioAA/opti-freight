/**
 * Program IDs for all Opti-Freight Solana programs
 * These match the declared IDs in the Rust contracts
 */

import { PublicKey } from '@solana/web3.js';

export const PROGRAM_IDS = {
  // Unified Program (RECOMMENDED - includes all functionality)
  OPTI_FREIGHT: new PublicKey('HAsA9cM5SRhGKNNrQy9c7JF3rCsGwRC6A5ycNbKxpnWU'),

  // Legacy Programs (for backwards compatibility)
  ASSET_NFT: new PublicKey('2ESjYkkwqZYBkAA6gBprX9xaRhqgPVyMyZLkGVAq7YtU'),
  PRIMARY_MARKET: new PublicKey('Az1M72qgA5REQjiV789DrSqgMG1UGrL7puRXEqBCAHFQ'),
  SECONDARY_MARKET: new PublicKey('DakwaYqG3tV9Jjgy5GokyQJd3JWb74Qx66JHqbZicsZX'),
  RETURNS_DISTRIBUTION: new PublicKey('DVfDdWLdsin4LGgor4B1nNQTSe4oi5F4cfmRVafpeMog'),
  GOVERNANCE: new PublicKey('GvRNcaWJxH5YM3p8k6mwUhY7LzASwYxNzmgXzD4zzzz'),
} as const;

export type ProgramId = keyof typeof PROGRAM_IDS;
