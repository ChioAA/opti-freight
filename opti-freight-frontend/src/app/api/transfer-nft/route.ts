import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
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

    if (!buyerAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { TREASURY_PRIVATE_KEY, NEXT_PUBLIC_SOLANA_RPC_HOST } = process.env;

    if (!TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Treasury private key not configured' },
        { status: 500 }
      );
    }

    // Crear keypair de tesorería
    const secretKey = bs58.decode(TREASURY_PRIVATE_KEY);
    const treasuryKeypair = Keypair.fromSecretKey(secretKey);

    // Conectar a Solana
    const connection = new Connection(
      NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.devnet.solana.com',
      'confirmed'
    );

    const buyerPublicKey = new PublicKey(buyerAddress);

    // Leer lista de NFTs disponibles
    const nftListPath = path.join(process.cwd(), '..', 'opti-freight-contracts', 'nfts-serie1.json');

    let nftData;
    try {
      const fileContent = fs.readFileSync(nftListPath, 'utf-8');
      nftData = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json(
        { error: 'NFT list not found. Please mint NFTs first.' },
        { status: 500 }
      );
    }

    if (!nftData.nftMints || nftData.nftMints.length === 0) {
      return NextResponse.json(
        { error: 'No NFTs available' },
        { status: 400 }
      );
    }

    // Tomar los primeros X NFTs disponibles
    const nftsToTransfer = nftData.nftMints.slice(0, amount);

    if (nftsToTransfer.length < amount) {
      return NextResponse.json(
        { error: `Only ${nftsToTransfer.length} NFTs available, but ${amount} requested` },
        { status: 400 }
      );
    }

    const transferredNfts = [];

    // Transferir cada NFT
    for (const nftMint of nftsToTransfer) {
      try {
        const mintPublicKey = new PublicKey(nftMint);

        // Obtener cuentas de token asociadas
        const fromTokenAccount = await getAssociatedTokenAddress(
          mintPublicKey,
          treasuryKeypair.publicKey
        );

        const toTokenAccount = await getAssociatedTokenAddress(
          mintPublicKey,
          buyerPublicKey
        );

        // Verificar si la cuenta del comprador existe
        let createAtaIx = null;
        try {
          await getAccount(connection, toTokenAccount);
        } catch (error) {
          // Crear ATA para el comprador
          createAtaIx = createAssociatedTokenAccountInstruction(
            treasuryKeypair.publicKey, // payer
            toTokenAccount,
            buyerPublicKey, // owner
            mintPublicKey
          );
        }

        // Crear instrucción de transferencia
        const transferIx = createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          treasuryKeypair.publicKey,
          1, // 1 NFT
          [],
          TOKEN_PROGRAM_ID
        );

        // Crear y enviar transacción
        const { Transaction } = await import('@solana/web3.js');
        const transaction = new Transaction();

        if (createAtaIx) {
          transaction.add(createAtaIx);
        }
        transaction.add(transferIx);

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = treasuryKeypair.publicKey;

        // Firmar y enviar
        transaction.sign(treasuryKeypair);
        const txSignature = await connection.sendRawTransaction(transaction.serialize());
        await connection.confirmTransaction(txSignature, 'confirmed');

        transferredNfts.push({
          nftMint: nftMint,
          signature: txSignature,
        });

        console.log(`✅ Transferred NFT ${nftMint} to ${buyerAddress}. TX: ${txSignature}`);
      } catch (error) {
        console.error(`❌ Error transferring NFT ${nftMint}:`, error);
      }
    }

    // Actualizar lista de NFTs (remover los transferidos)
    nftData.nftMints = nftData.nftMints.slice(amount);
    fs.writeFileSync(nftListPath, JSON.stringify(nftData, null, 2));

    console.log(`📝 Updated NFT list. Remaining: ${nftData.nftMints.length}`);

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ${transferredNfts.length} NFT(s)`,
      transferredNfts,
      remainingNfts: nftData.nftMints.length,
    });
  } catch (error: any) {
    console.error('Error transferring NFTs:', error);
    return NextResponse.json(
      {
        error: 'Failed to transfer NFTs',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
