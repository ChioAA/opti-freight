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

    // Leer datos de los tokens para actualizar disponibilidad
    const tokenDataPath = path.join(process.cwd(), '..', 'opti-freight-contracts', 'tokens-serie1.json');
    let tokenData;

    try {
      const fileContent = fs.readFileSync(tokenDataPath, 'utf-8');
      tokenData = JSON.parse(fileContent);
      console.log('📊 Token data loaded:', {
        available: tokenData.availableTokens,
        total: tokenData.totalSupply
      });
    } catch (error) {
      console.warn('⚠️ Could not read token data file:', error);
      tokenData = null;
    }

    // Verificar disponibilidad
    if (tokenData && tokenData.availableTokens < amount) {
      return NextResponse.json(
        { error: `Only ${tokenData.availableTokens} tokens available, but ${amount} requested` },
        { status: 400 }
      );
    }

    // Obtener cuentas de token asociadas
    const fromTokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      treasuryKeypair.publicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      buyerPublicKey
    );

    console.log('💼 Token accounts:', {
      from: fromTokenAccount.toString(),
      to: toTokenAccount.toString()
    });

    // Verificar balance de la treasury
    try {
      const treasuryTokenAccountInfo = await getAccount(connection, fromTokenAccount);
      console.log('💰 Treasury balance:', treasuryTokenAccountInfo.amount.toString());

      if (Number(treasuryTokenAccountInfo.amount) < amount) {
        return NextResponse.json(
          { error: `Treasury has insufficient tokens. Available: ${treasuryTokenAccountInfo.amount}` },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('❌ Error checking treasury balance:', error);
      return NextResponse.json(
        { error: 'Could not verify treasury token balance' },
        { status: 500 }
      );
    }

    // Verificar si la cuenta del comprador existe
    let createAtaIx = null;
    try {
      await getAccount(connection, toTokenAccount);
      console.log('✅ Buyer token account already exists');
    } catch (error) {
      console.log('🆕 Creating new token account for buyer');
      // Crear ATA para el comprador
      createAtaIx = createAssociatedTokenAccountInstruction(
        treasuryKeypair.publicKey, // payer
        toTokenAccount,
        buyerPublicKey, // owner
        tokenMintPublicKey
      );
    }

    // Crear instrucción de transferencia
    const transferIx = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      treasuryKeypair.publicKey,
      amount, // Cantidad de tokens
      [],
      TOKEN_PROGRAM_ID
    );

    // Crear y enviar transacción
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

    console.log('📤 Transaction sent:', txSignature);
    console.log('⏳ Waiting for confirmation...');

    await connection.confirmTransaction(txSignature, 'confirmed');

    console.log(`✅ Transferred ${amount} token(s) to ${buyerAddress}. TX: ${txSignature}`);

    // Actualizar archivo de datos si existe
    if (tokenData) {
      tokenData.availableTokens -= amount;
      try {
        fs.writeFileSync(tokenDataPath, JSON.stringify(tokenData, null, 2));
        console.log(`📝 Updated token data. Remaining: ${tokenData.availableTokens}`);
      } catch (error) {
        console.error('⚠️ Could not update token data file:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ${amount} token(s)`,
      txSignature,
      buyerAddress,
      amount,
      tokenMint: tokenMintPublicKey.toString(),
      remainingTokens: tokenData ? tokenData.availableTokens : null,
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
