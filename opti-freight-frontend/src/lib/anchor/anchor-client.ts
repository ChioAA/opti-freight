/**
 * Anchor client for Opti-Freight programs
 * Provides typed interfaces to interact with on-chain programs
 */

import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { PROGRAM_IDS } from './program-ids';

// Import IDLs
import optiFreightIdl from '../idl/opti_freight.json';
import primaryMarketIdl from '../idl/primary_market.json';
import secondaryMarketIdl from '../idl/secondary_market.json';
import returnsDistributionIdl from '../idl/returns_distribution.json';

export interface AnchorClientConfig {
  wallet: WalletContextState;
  network?: 'devnet' | 'mainnet-beta' | 'localnet';
  customRpcUrl?: string;
}

/**
 * Main Anchor client class
 * Manages all program interactions for Opti-Freight
 */
export class AnchorClient {
  private connection: Connection;
  private provider: AnchorProvider | null = null;
  public optiFreight: Program | null = null;
  public primaryMarket: Program | null = null;
  public secondaryMarket: Program | null = null;
  public returnsDistribution: Program | null = null;

  constructor(private config: AnchorClientConfig) {
    const rpcUrl = config.customRpcUrl || clusterApiUrl(config.network || 'devnet');
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Initialize the Anchor provider and programs
   * Must be called after wallet is connected
   */
  async initialize(): Promise<void> {
    if (!this.config.wallet.publicKey || !this.config.wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    // Create provider
    this.provider = new AnchorProvider(
      this.connection,
      this.config.wallet as any,
      { commitment: 'confirmed' }
    );

    // Initialize unified program (RECOMMENDED)
    this.optiFreight = new Program(
      optiFreightIdl as Idl,
      PROGRAM_IDS.OPTI_FREIGHT,
      this.provider
    );

    // Initialize legacy programs (for backwards compatibility)
    this.primaryMarket = new Program(
      primaryMarketIdl as Idl,
      PROGRAM_IDS.PRIMARY_MARKET,
      this.provider
    );

    this.secondaryMarket = new Program(
      secondaryMarketIdl as Idl,
      PROGRAM_IDS.SECONDARY_MARKET,
      this.provider
    );

    this.returnsDistribution = new Program(
      returnsDistributionIdl as Idl,
      PROGRAM_IDS.RETURNS_DISTRIBUTION,
      this.provider
    );
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.provider !== null && this.primaryMarket !== null;
  }

  /**
   * Get the connection object
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get the provider (throws if not initialized)
   */
  getProvider(): AnchorProvider {
    if (!this.provider) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.provider;
  }
}

/**
 * Create and initialize an Anchor client
 */
export async function createAnchorClient(
  config: AnchorClientConfig
): Promise<AnchorClient> {
  const client = new AnchorClient(config);

  if (config.wallet.publicKey) {
    await client.initialize();
  }

  return client;
}
