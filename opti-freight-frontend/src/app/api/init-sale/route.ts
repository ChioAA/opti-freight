import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import optiFreightIdl from '@/lib/idl/opti_freight.json';

const PROGRAM_ID = new PublicKey('7x4rNdNN9Szce8qfasDGiV3srApWcJ339t8iGAyKjrga');

// Implementación simple de Wallet compatible con Anchor
class SimpleWallet {
  constructor(readonly payer: Keypair) {}

  async signTransaction<T extends Transaction>(tx: T): Promise<T> {
    tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]> {
    return txs.map((tx) => {
      tx.partialSign(this.payer);
      return tx;
    });
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}

export async function POST() {
  try {
    const { TREASURY_PRIVATE_KEY, NEXT_PUBLIC_SOLANA_RPC_HOST } = process.env;

    if (!TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Treasury private key not configured' },
        { status: 500 }
      );
    }

    console.log('🚀 Initializing sale...');

    // Crear keypair desde la private key
    // Soporta tanto formato base58 como formato JSON array
    let secretKey;
    try {
      // Intentar primero como JSON array
      if (TREASURY_PRIVATE_KEY.startsWith('[')) {
        const keyArray = JSON.parse(TREASURY_PRIVATE_KEY);
        secretKey = Uint8Array.from(keyArray);
      } else {
        // Si no, intentar como base58
        secretKey = bs58.decode(TREASURY_PRIVATE_KEY);
      }
    } catch (parseError: any) {
      console.error('Error parsing TREASURY_PRIVATE_KEY:', parseError.message);
      return NextResponse.json(
        {
          error: 'Invalid TREASURY_PRIVATE_KEY format',
          details: 'Key must be either base58 string or JSON array of numbers'
        },
        { status: 500 }
      );
    }

    const treasuryKeypair = Keypair.fromSecretKey(secretKey);

    console.log('Treasury:', treasuryKeypair.publicKey.toString());

    // Conectar a Solana
    const connection = new Connection(
      NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Crear provider con nuestra implementación simple de Wallet
    const wallet = new SimpleWallet(treasuryKeypair);
    const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });

    // Crear programa
    const program = new Program(optiFreightIdl as any, provider);

    // Derivar PDA para la venta
    const [salePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('sale'), treasuryKeypair.publicKey.toBuffer()],
      PROGRAM_ID
    );

    console.log('Sale PDA:', salePda.toString());

    // Verificar si ya existe una venta
    try {
      const existingSale = await (program.account as any).sale.fetch(salePda);
      if (existingSale) {
        console.log('✅ Sale already exists!');
        return NextResponse.json({
          success: true,
          message: 'Sale already exists',
          saleAddress: salePda.toString(),
          sale: {
            authority: existingSale.authority.toString(),
            total: existingSale.total,
            sold: existingSale.sold,
            active: existingSale.active,
          },
        });
      }
    } catch (err) {
      // Sale no existe, continuar con la inicialización
      console.log('Sale does not exist, creating...');
    }

    // Inicializar la venta
    console.log('⏳ Sending transaction...');
    console.log('Accounts being sent:');
    console.log('  authority:', treasuryKeypair.publicKey.toString());
    console.log('  sale:', salePda.toString());
    console.log('  systemProgram:', SystemProgram.programId.toString());

    const tx = await program.methods
      .initSale()
      .accounts({
        authority: treasuryKeypair.publicKey,
        sale: salePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Sale initialized! Transaction:', tx);

    // Obtener la venta recién creada
    const sale = await (program.account as any).sale.fetch(salePda);

    return NextResponse.json({
      success: true,
      message: 'Sale initialized successfully',
      signature: tx,
      saleAddress: salePda.toString(),
      sale: {
        authority: sale.authority.toString(),
        total: sale.total,
        sold: sale.sold,
        active: sale.active,
      },
    });
  } catch (error: any) {
    console.error('❌ Error initializing sale:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize sale',
        details: error.message,
        errorType: error.constructor.name,
        logs: error.logs || null,
      },
      { status: 500 }
    );
  }
}
