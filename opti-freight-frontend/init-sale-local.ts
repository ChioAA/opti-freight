import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

// Configuración
const PROGRAM_ID = new PublicKey('7x4rNdNN9Szce8qfasDGiV3srApWcJ339t8iGAyKjrga');
const RPC_URL = 'https://api.devnet.solana.com';
const KEYPAIR_PATH = path.join(process.env.HOME!, '.config/solana/opti-freight-wallet.json');

async function initSale() {
  try {
    console.log('🚀 Inicializando venta de Serie 1...\n');

    // Cargar keypair
    const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log('✅ Authority:', keypair.publicKey.toString());

    // Verificar balance
    const connection = new Connection(RPC_URL, 'confirmed');
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`✅ Balance: ${balance / 1e9} SOL\n`);

    if (balance < 0.01 * 1e9) {
      console.error('❌ Balance insuficiente. Necesitas al menos 0.01 SOL');
      console.log('Ejecuta: solana airdrop 1 ' + keypair.publicKey.toString() + ' --url devnet');
      process.exit(1);
    }

    // Cargar IDL
    const idlPath = path.join(__dirname, 'src/lib/idl/opti_freight.json');
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

    // Crear provider
    const wallet = new Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

    // Crear programa
    const program = new Program(idl, provider);
    console.log('✅ Programa cargado:', program.programId.toString());

    // Derivar PDA para la venta
    const [salePda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('sale'), keypair.publicKey.toBuffer()],
      PROGRAM_ID
    );
    console.log('✅ Sale PDA:', salePda.toString());
    console.log('✅ Bump:', bump, '\n');

    // Verificar si la venta ya existe
    try {
      const existingSale = await program.account.sale.fetch(salePda);
      console.log('✅ ¡La venta ya existe!');
      console.log('   Authority:', existingSale.authority.toString());
      console.log('   Total tokens:', existingSale.total);
      console.log('   Vendidos:', existingSale.sold);
      console.log('   Activa:', existingSale.active);
      return;
    } catch (err) {
      console.log('📝 La venta no existe aún, creando...\n');
    }

    // Inicializar la venta
    console.log('⏳ Enviando transacción init_sale...');

    const tx = await program.methods
      .initSale()
      .accounts({
        authority: keypair.publicKey,
        sale: salePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('\n✅ ¡Venta inicializada exitosamente!');
    console.log('📝 Transaction:', tx);
    console.log('🔗 Ver en explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet\n');

    // Obtener la venta recién creada
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar confirmación
    const sale = await program.account.sale.fetch(salePda);

    console.log('📊 Datos de la venta:');
    console.log('   Authority:', sale.authority.toString());
    console.log('   Total tokens:', sale.total);
    console.log('   Vendidos:', sale.sold);
    console.log('   Activa:', sale.active);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.logs) {
      console.error('📜 Program logs:');
      error.logs.forEach((log: string) => console.error('  ', log));
    }
    process.exit(1);
  }
}

initSale();
