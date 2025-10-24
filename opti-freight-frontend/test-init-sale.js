const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const bs58 = require('bs58');
const fs = require('fs');

// Cargar IDL
const idl = JSON.parse(fs.readFileSync('./src/lib/idl/opti_freight.json', 'utf8'));

const PROGRAM_ID = new PublicKey('7x4rNdNN9Szce8qfasDGiV3srApWcJ339t8iGAyKjrga');
const TREASURY_PRIVATE_KEY = '35Y28X2k6azBTfvKoDKnPcZcvzdmT5zxVpdKcvXBZkMKz2dQ6ZFUNiSzWQGhRkipf9FBUVFYoWqh4sZFihPbPtVG';

async function testInitSale() {
  try {
    console.log('🚀 Testing init_sale...');

    // Crear keypair desde la private key
    const secretKey = bs58.default.decode(TREASURY_PRIVATE_KEY);
    const treasuryKeypair = Keypair.fromSecretKey(secretKey);
    
    console.log('Treasury Public Key:', treasuryKeypair.publicKey.toString());

    // Conectar a Solana devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Crear wallet
    const wallet = new Wallet(treasuryKeypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

    // Crear programa
    const program = new Program(idl, provider);
    console.log('Program ID:', program.programId.toString());

    // Derivar PDA para la venta
    const [salePda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('sale'), treasuryKeypair.publicKey.toBuffer()],
      PROGRAM_ID
    );

    console.log('Sale PDA:', salePda.toString());
    console.log('Bump:', bump);

    // Verificar si la venta ya existe
    try {
      const existingSale = await program.account.sale.fetch(salePda);
      console.log('✅ Sale already exists:', existingSale);
      return;
    } catch (err) {
      console.log('Sale does not exist, creating...');
    }

    // Inicializar la venta
    console.log('⏳ Sending init_sale transaction...');

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
    const sale = await program.account.sale.fetch(salePda);
    console.log('Sale data:', sale);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error message:', error.message);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
  }
}

testInitSale();
