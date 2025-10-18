import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import optiFreightIdl from '@/lib/idl/opti_freight.json';

const PROGRAM_ID = new PublicKey('HAsA9cM5SRhGKNNrQy9c7JF3rCsGwRC6A5ycNbKxpnWU');

export async function POST(request: Request) {
  try {
    const { TREASURY_PRIVATE_KEY, NEXT_PUBLIC_SOLANA_RPC_HOST } = process.env;

    if (!TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Treasury private key not configured' },
        { status: 500 }
      );
    }

    // Crear keypair desde la private key
    const secretKey = bs58.decode(TREASURY_PRIVATE_KEY);
    const treasuryKeypair = Keypair.fromSecretKey(secretKey);

    // Conectar a Solana
    const connection = new Connection(
      NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Crear provider
    const wallet = new Wallet(treasuryKeypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

    // Crear programa
    const program = new Program(optiFreightIdl as any, provider);

    // Derivar PDA para la venta
    const [salePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('sale'), treasuryKeypair.publicKey.toBuffer()],
      PROGRAM_ID
    );

    // Verificar si ya existe una venta
    try {
      const existingSale = await program.account.sale.fetch(salePda);
      if (existingSale) {
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
    const tx = await program.methods
      .initSale()
      .accounts({
        authority: treasuryKeypair.publicKey,
        sale: salePda,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log('Sale initialized. Transaction:', tx);

    // Obtener la venta recién creada
    const sale = await program.account.sale.fetch(salePda);

    return NextResponse.json({
      success: true,
      message: 'Sale initialized successfully',
      transaction: tx,
      saleAddress: salePda.toString(),
      sale: {
        authority: sale.authority.toString(),
        total: sale.total,
        sold: sale.sold,
        active: sale.active,
      },
    });
  } catch (error: any) {
    console.error('Error initializing sale:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize sale',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
