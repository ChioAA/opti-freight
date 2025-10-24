/**
 * Script para probar la compra y ver el error exacto
 */

const {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey("7x4rNdNN9Szce8qfasDGiV3srApWcJ339t8iGAyKjrga");
const BUY_PRIMARY_DISCRIMINATOR = Buffer.from([89, 86, 227, 49, 41, 118, 66, 248]);

async function testBuy() {
  console.log("🧪 Testing buy_primary transaction\n");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Accounts
  const buyer = new PublicKey("Boq4rZ87cycKcRrZq8UeTTdHio22LWVuFHXma6Xq4WjY");
  const treasuryAuthority = new PublicKey("H6XLCy6UcVa7rse3EYLcsCFdyxdX6FRGKtLAPtmgMZb5");
  const platform = new PublicKey("468zRBWHvREsy67no7yVviW69i173dZt25XKsDqKeCNh");

  const [salePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("sale"), treasuryAuthority.toBuffer()],
    PROGRAM_ID
  );

  console.log("📋 Accounts:");
  console.log("  Buyer:", buyer.toString());
  console.log("  Sale PDA:", salePda.toString());
  console.log("  Seller (Treasury):", treasuryAuthority.toString());
  console.log("  Platform:", platform.toString());
  console.log();

  // Amount: 1 token (u16)
  const amountBuffer = Buffer.alloc(2);
  amountBuffer.writeUInt16LE(1, 0);

  const data = Buffer.concat([BUY_PRIMARY_DISCRIMINATOR, amountBuffer]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: salePda, isSigner: false, isWritable: true },
      { pubkey: treasuryAuthority, isSigner: false, isWritable: true },
      { pubkey: platform, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: data,
  });

  const transaction = new Transaction().add(instruction);

  try {
    console.log("🔄 Simulating transaction...\n");

    const { value } = await connection.simulateTransaction(transaction, []);

    if (value.err) {
      console.error("❌ Simulation failed:");
      console.error(JSON.stringify(value.err, null, 2));

      if (value.logs) {
        console.error("\n📜 Program logs:");
        value.logs.forEach((log) => console.error(log));
      }
    } else {
      console.log("✅ Simulation successful!");
      if (value.logs) {
        console.log("\n📜 Program logs:");
        value.logs.forEach((log) => console.log(log));
      }
    }
  } catch (error) {
    console.error("\n❌ Error:");
    console.error(error.message);
  }
}

testBuy().catch(console.error);
