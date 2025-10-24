import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buyerAddress, amount, signature } = body;

    console.log('📥 Transfer request received:', { buyerAddress, amount, signature });

    if (!buyerAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { TREASURY_PRIVATE_KEY, NEXT_PUBLIC_SOLANA_RPC_HOST, OPTIFREIGHT_TOKEN_MINT } = process.env;

    if (!TREASURY_PRIVATE_KEY || !OPTIFREIGHT_TOKEN_MINT) {
      console.error('❌ Missing environment variables:', {
        hasTreasuryKey: !!TREASURY_PRIVATE_KEY,
        hasTokenMint: !!OPTIFREIGHT_TOKEN_MINT
      });
      return NextResponse.json(
        { error: 'Server configuration error: Missing treasury key or token mint' },
        { status: 500 }
      );
    }

    // Crear keypair de tesorería
    const secretKey = bs58.decode(TREASURY_PRIVATE_KEY);
    const treasuryKeypair = Keypair.fromSecretKey(secretKey);

    console.log('🔑 Treasury wallet:', treasuryKeypair.publicKey.toString());

    // Conectar a Solana
    const connection = new Connection(
      NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.devnet.solana.com',
      'confirmed'
    );

    const buyerPublicKey = new PublicKey(buyerAddress);
    const tokenMintPublicKey = new PublicKey(OPTIFREIGHT_TOKEN_MINT);

    console.log('🪙 Token Mint:', tokenMintPublicKey.toString());

    // Leer datos de los NFTs
    const nftDataPath = path.join(process.cwd(), '..', 'opti-freight-contracts', 'nfts-serie1.json');
    let nftData;

    try {
      const fileContent = fs.readFileSync(nftDataPath, 'utf-8');
      nftData = JSON.parse(fileContent);
      console.log('📊 NFT data loaded:', {
        available: nftData.nftMints.length,
        total: nftData.totalNfts
      });
    } catch (error) {
      console.error('❌ Could not read NFT data file:', error);
      return NextResponse.json(
        { error: 'NFT data not available' },
        { status: 500 }
      );
    }

    // Verificar disponibilidad
    if (nftData.nftMints.length < amount) {
      return NextResponse.json(
        { error: `Only ${nftData.nftMints.length} NFTs available, but ${amount} requested` },
        { status: 400 }
      );
    }

    // Transferir NFTs uno por uno
    const transferredNfts = [];
    const nftsToTransfer = nftData.nftMints.slice(0, amount);

    for (const nftMint of nftsToTransfer) {
      const mintPublicKey = new PublicKey(nftMint);

      // Obtener cuentas de token asociadas para este NFT
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        treasuryKeypair.publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        buyerPublicKey
      );

      console.log(`📦 Transferring NFT ${nftMint} from ${fromTokenAccount.toString()} to ${toTokenAccount.toString()}`);

      // Verificar si la cuenta del comprador existe
      const transaction = new Transaction();
      try {
        await getAccount(connection, toTokenAccount);
      } catch (error) {
        // Crear ATA para el comprador
        const createAtaIx = createAssociatedTokenAccountInstruction(
          treasuryKeypair.publicKey,
          toTokenAccount,
          buyerPublicKey,
          mintPublicKey
        );
        transaction.add(createAtaIx);
      }

      // Crear instrucción de transferencia (1 NFT)
      const transferIx = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        treasuryKeypair.publicKey,
        1, // 1 NFT único
        [],
        TOKEN_PROGRAM_ID
      );

      transaction.add(transferIx);

      // Enviar transacción
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = treasuryKeypair.publicKey;

      transaction.sign(treasuryKeypair);
      const txSignature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(txSignature, 'confirmed');

      console.log(`✅ Transferred NFT ${nftMint}. TX: ${txSignature}`);
      transferredNfts.push({ mint: nftMint, signature: txSignature });
    }

    // Actualizar archivo de datos
    nftData.nftMints = nftData.nftMints.slice(amount);
    try {
      fs.writeFileSync(nftDataPath, JSON.stringify(nftData, null, 2));
      console.log(`📝 Updated NFT data. Remaining: ${nftData.nftMints.length}`);
    } catch (error) {
      console.error('⚠️ Could not update NFT data file:', error);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ${amount} NFT(s)`,
      buyerAddress,
      amount,
      transferredNfts,
      remainingNfts: nftData.nftMints.length,
    });
  } catch (error: any) {
    console.error('❌ Error transferring tokens:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to transfer tokens',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
