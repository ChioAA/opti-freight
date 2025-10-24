/**
 * Test para verificar la transacción exacta que se está enviando
 */

const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

async function testTransaction() {
  console.log('🧪 Testing buy_primary transaction with Anchor\n');

  // 1. Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // 2. Load IDL
  const idl = JSON.parse(
    fs.readFileSync(
      './src/lib/idl/opti_freight.json',
      'utf8'
    )
  );

  console.log('✅ IDL loaded');
  console.log('Program ID from IDL:', idl.address);

  // 3. Program ID
  const programId = new PublicKey(idl.address);

  // 4. Create a dummy wallet
  const dummyKeypair = Keypair.generate();
  const wallet = new anchor.Wallet(dummyKeypair);

  // 5. Create provider
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed', skipPreflight: true }
  );

  // 6. Create program
  const program = new anchor.Program(idl, programId, provider);

  console.log('✅ Program initialized\n');

  // 7. Accounts
  const buyer = new PublicKey('Boq4rZ87cycKcRrZq8UeTTdHio22LWVuFHXma6Xq4WjY');
  const treasuryAuthority = new PublicKey('H6XLCy6UcVa7rse3EYLcsCFdyxdX6FRGKtLAPtmgMZb5');
  const platform = new PublicKey('468zRBWHvREsy67no7yVviW69i173dZt25XKsDqKeCNh');

  const [salePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('sale'), treasuryAuthority.toBuffer()],
    programId
  );

  console.log('📋 Accounts:');
  console.log('  Buyer:', buyer.toString());
  console.log('  Sale PDA:', salePda.toString());
  console.log('  Seller (Treasury):', treasuryAuthority.toString());
  console.log('  Platform:', platform.toString());
  console.log('  System Program:', SystemProgram.programId.toString());
  console.log();

  // 8. Build transaction
  try {
    console.log('🔨 Building transaction...\n');

    const tx = await program.methods
      .buyPrimary(1)
      .accounts({
        buyer: buyer,
        sale: salePda,
        seller: treasuryAuthority,
        platform: platform,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    console.log('✅ Transaction built successfully!');
    console.log('\n📦 Transaction details:');
    console.log('  Instructions:', tx.instructions.length);

    tx.instructions.forEach((ix, i) => {
      console.log(`\n  Instruction ${i + 1}:`);
      console.log('    Program ID:', ix.programId.toString());
      console.log('    Keys:', ix.keys.length);
      ix.keys.forEach((key, j) => {
        console.log(`      ${j + 1}. ${key.pubkey.toString()} (signer: ${key.isSigner}, writable: ${key.isWritable})`);
      });
      console.log('    Data length:', ix.data.length, 'bytes');
      console.log('    Data (hex):', ix.data.toString('hex'));
    });

    // 9. Get recent blockhash
    console.log('\n🔗 Getting recent blockhash...');
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = buyer;

    console.log('✅ Blockhash:', blockhash);
    console.log('✅ Fee Payer:', buyer.toString());

    // 10. Simulate (without signing)
    console.log('\n🔄 Simulating transaction...\n');

    const simulation = await connection.simulateTransaction(tx);

    if (simulation.value.err) {
      console.error('❌ Simulation failed:');
      console.error(JSON.stringify(simulation.value.err, null, 2));

      if (simulation.value.logs) {
        console.error('\n📜 Program logs:');
        simulation.value.logs.forEach((log) => console.error(log));
      }
    } else {
      console.log('✅ Simulation successful!');
      console.log('Units consumed:', simulation.value.unitsConsumed);

      if (simulation.value.logs) {
        console.log('\n📜 Program logs:');
        simulation.value.logs.forEach((log) => console.log(log));
      }
    }
  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error.message);
    if (error.logs) {
      console.error('\n📜 Logs:');
      error.logs.forEach((log) => console.error(log));
    }
  }
}

testTransaction().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
