'use client';

/**
 * Hook para mintear NFTs RWA de OptiFreight usando el programa customizado asset_nft
 * Cada NFT representa la propiedad fraccionada de un trailer (Real World Asset)
 */

import { useCallback } from 'react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction
} from '@solana/spl-token';
import {
  createCreateMetadataAccountV3Instruction,
} from '@metaplex-foundation/mpl-token-metadata';

// Metaplex Token Metadata Program ID (constante en todas las redes)
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
import assetNftIdl from '@/lib/anchor/idl/asset_nft.json';
import { PROGRAM_IDS } from '@/lib/anchor/program-ids';

// Tipos para window.solana (Phantom wallet)
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isConnected?: boolean;
      publicKey?: PublicKey;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      off: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

interface MintNFTResult {
  success: boolean;
  mintAddress?: string;
  signature?: string;
  error?: string;
}

export function useMintNFT() {
  const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com";
  const connection = new Connection(SOLANA_RPC, 'confirmed');

  /**
   * Mintea un NFT RWA para OptiFreight Serie 1
   * Este NFT representa propiedad fraccionada del trailer Volvo VNL 860
   *
   * Flujo:
   * 1. Crear un nuevo mint (NFT único)
   * 2. Llamar al programa asset_nft para registrar el trailer
   * 3. Mintear 1 token a la wallet del usuario (NFT)
   */
  const mintOptiFreightSerie1 = useCallback(
    async (tokensOwned: number, userPublicKey: PublicKey): Promise<MintNFTResult> => {
      console.log('🎨 [VERSION NUEVA v2] Iniciando minteo de NFT RWA OptiFreight Serie 1');
      console.log('🔍 userPublicKey recibido:', userPublicKey?.toString());

      // Verificar que window.solana esté disponible y conectada
      if (typeof window === 'undefined' || !window.solana || !userPublicKey) {
        console.error('❌ Wallet no conectada o no puede firmar');
        console.error('❌ Debug:', {
          window: typeof window !== 'undefined',
          solana: typeof window !== 'undefined' && !!window.solana,
          userPublicKey: !!userPublicKey,
          userPublicKeyValue: userPublicKey?.toString() || 'null'
        });
        return {
          success: false,
          error: 'Por favor conecta tu wallet primero',
        };
      }

      try {
        console.log('👛 Wallet conectada:', userPublicKey.toString());

        // Crear wrapper de wallet para Anchor usando window.solana
        const wallet = {
          publicKey: userPublicKey,
          signTransaction: window.solana.signTransaction.bind(window.solana),
          signAllTransactions: window.solana.signAllTransactions.bind(window.solana),
        };

        // Crear provider de Anchor
        const provider = new AnchorProvider(
          connection,
          wallet as any,
          { commitment: 'confirmed' }
        );

        // Cargar programa asset_nft
        const program = new Program(assetNftIdl as any, provider);
        console.log('📦 Programa asset_nft cargado:', program.programId.toString());
        console.log('📦 Program ID esperado:', PROGRAM_IDS.ASSET_NFT.toString());

        // Paso 1: Crear un nuevo mint (esto será el NFT único)
        console.log('🔨 Creando mint NFT...');
        const mintKeypair = Keypair.generate();

        // Crear mint manualmente usando transacciones en lugar de createMint
        const lamports = await getMinimumBalanceForRentExemptMint(connection);

        const transaction = new Transaction().add(
          SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_PROGRAM_ID,
          }),
          createInitializeMintInstruction(
            mintKeypair.publicKey,
            0, // 0 decimals for NFT
            wallet.publicKey, // mint authority
            null, // freeze authority
            TOKEN_PROGRAM_ID
          )
        );

        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.partialSign(mintKeypair);

        const signed = await wallet.signTransaction!(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);

        const mint = mintKeypair.publicKey;
        console.log('✅ Mint creado:', mint.toString());

        // Paso 2: Llamar al programa para registrar el trailer asset
        const nftNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const nftName = `OptiFreight Serie 1 #${nftNumber}`;

        // Derivar PDA para trailer_asset
        const [trailerAssetPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('trailer'), mint.toBuffer()],
          program.programId
        );

        console.log('📝 Registrando trailer asset en programa...');
        console.log('   PDA:', trailerAssetPDA.toString());

        // Intentar crear el trailer asset en el programa
        let tx;
        try {
          tx = await program.methods
            .createTrailerNft(
              nftName,
              'OptiS1',
              'https://arweave.net/placeholder', // URI de metadata (actualizar con imagen real)
              'Serie 1 - Volvo VNL 860',
              new BN(120_000_000_000), // PARA PRUEBAS // total_value: 120 SOL (1000 tokens x 0.12 SOL) en lamports
              new BN(120_000_000), // PARA PRUEBAS // token_price: 0.12 SOL en lamports
              1000, // total_tokens
              185, // apy: 18.5% (185 basis points)
              5 // term_years
            )
            .accounts({
              authority: wallet.publicKey,
              trailerAsset: trailerAssetPDA,
              mint: mint,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              rent: SYSVAR_RENT_PUBKEY,
            })
            .rpc();

          console.log('✅ Trailer asset registrado. Signature:', tx);
        } catch (error: any) {
          // Si el error es "transaction already processed", significa que SÍ se creó
          // exitosamente pero Anchor está teniendo problemas con la confirmación
          if (error.message?.includes('already been processed') ||
              error.transactionMessage?.includes('already been processed')) {
            console.log('⚠️ Transaction already processed (pero se creó exitosamente)');
            tx = 'already_processed';
          } else {
            throw error;
          }
        }

        // Paso 3: Mintear 1 token (el NFT) a la wallet del usuario
        console.log('🎨 Minteando NFT a tu wallet...');

        const userTokenAddress = await getAssociatedTokenAddress(
          mint,
          wallet.publicKey
        );

        const mintTransaction = new Transaction();

        // Crear ATA si no existe
        const accountInfo = await connection.getAccountInfo(userTokenAddress);
        if (!accountInfo) {
          mintTransaction.add(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey, // payer
              userTokenAddress, // ata
              wallet.publicKey, // owner
              mint // mint
            )
          );
        }

        // Mintear 1 NFT al ATA
        mintTransaction.add(
          createMintToInstruction(
            mint, // mint
            userTokenAddress, // destination
            wallet.publicKey, // authority
            1 // amount (1 NFT)
          )
        );

        mintTransaction.feePayer = wallet.publicKey;
        mintTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        let mintSig;
        try {
          const signedMintTx = await wallet.signTransaction!(mintTransaction);
          mintSig = await connection.sendRawTransaction(signedMintTx.serialize());
          await connection.confirmTransaction(mintSig);

          console.log('🎉 NFT minteado exitosamente!');
          console.log('📍 Mint Address:', mint.toString());
          console.log('📍 Token Account:', userTokenAddress.toString());
          console.log('📍 Mint Signature:', mintSig);
        } catch (error: any) {
          // Si el error es "transaction already processed", verificar si el NFT ya existe
          if (error.message?.includes('already been processed') ||
              error.transactionMessage?.includes('already been processed')) {
            console.log('⚠️ Mint transaction already processed - verificando si NFT existe...');

            // Verificar si el NFT realmente se minteó
            const ataInfo = await connection.getAccountInfo(userTokenAddress);
            if (ataInfo) {
              console.log('✅ NFT ya está en tu wallet!');
              console.log('📍 Mint Address:', mint.toString());
              console.log('📍 Token Account:', userTokenAddress.toString());
              mintSig = 'already_processed_success';
            } else {
              throw new Error('NFT mint failed - ATA does not exist');
            }
          } else {
            throw error;
          }
        }

        // Paso 4: Crear metadata de Metaplex para que aparezca en Phantom
        console.log('📝 Creando metadata de Metaplex...');
        try {
          // Derivar la metadata PDA
          const [metadataPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('metadata'),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              mint.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
          );

          // Crear la instrucción de metadata
          const metadataInstruction = createCreateMetadataAccountV3Instruction(
            {
              metadata: metadataPDA,
              mint: mint,
              mintAuthority: wallet.publicKey,
              payer: wallet.publicKey,
              updateAuthority: wallet.publicKey,
            },
            {
              createMetadataAccountArgsV3: {
                data: {
                  name: nftName,
                  symbol: 'OPTIF1',
                  uri: 'https://arweave.net/optifreight-serie1-metadata', // URI temporal
                  sellerFeeBasisPoints: 300, // 3% royalties
                  creators: [
                    {
                      address: wallet.publicKey,
                      verified: true,
                      share: 100,
                    },
                  ],
                  collection: null,
                  uses: null,
                },
                isMutable: true,
                collectionDetails: null,
              },
            }
          );

          const metadataTransaction = new Transaction().add(metadataInstruction);
          metadataTransaction.feePayer = wallet.publicKey;
          metadataTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

          const signedMetadataTx = await wallet.signTransaction!(metadataTransaction);
          const metadataSig = await connection.sendRawTransaction(signedMetadataTx.serialize());
          await connection.confirmTransaction(metadataSig);

          console.log('✅ Metadata creada! Signature:', metadataSig);
          console.log('📍 Metadata PDA:', metadataPDA.toString());
        } catch (metadataError: any) {
          // Si falla la metadata, no es crítico - el NFT ya existe
          console.warn('⚠️ Error creando metadata (NFT existe pero sin metadata):', metadataError.message);
        }

        return {
          success: true,
          mintAddress: mint.toString(),
          signature: tx,
        };

      } catch (error: any) {
        console.error('❌ Error minteando NFT:', error);
        return {
          success: false,
          error: error.message || 'Error desconocido al mintear NFT',
        };
      }
    },
    [connection]
  );

  return {
    mintOptiFreightSerie1,
  };
}
