/**
 * Script simplificado para inicializar la venta
 * Usa web3.js directo en lugar de Anchor para evitar problemas con IDL
 */

const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} = require("@solana/web3.js");
const fs = require("fs");

const PROGRAM_ID = new PublicKey("7x4rNdNN9Szce8qfasDGiV3srApWcJ339t8iGAyKjrga");

// Discriminator para init_sale (del IDL)
const INIT_SALE_DISCRIMINATOR = Buffer.from([41, 197, 251, 217, 167, 153, 95, 49]);

async function main() {
  console.log("🚀 Initializing Sale for Opti-Freight Serie 1\n");

  // 1. Configurar conexión
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // 2. Cargar el keypair del treasury
  const keypairArray = JSON.parse(
    fs.readFileSync("/home/rocio/opti-f/mint-wallet.json", "utf-8")
  );
  const treasuryKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairArray));

  console.log("Treasury Address:", treasuryKeypair.publicKey.toString());

  // 3. Verificar balance
  const balance = await connection.getBalance(treasuryKeypair.publicKey);
  console.log("Current balance:", balance / 1e9, "SOL");

  if (balance < 0.01 * 1e9) {
    console.log("❌ Insufficient balance. Need at least 0.01 SOL for transaction fees.");
    process.exit(1);
  }

  // 4. Derivar PDA para la venta
  const [salePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("sale"), treasuryKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );

  console.log("Sale PDA:", salePda.toString());
  console.log("Bump:", bump);

  // 5. Verificar si ya existe una venta
  try {
    const accountInfo = await connection.getAccountInfo(salePda);
    if (accountInfo) {
      console.log("\n✅ Sale account already exists!");
      console.log("Account data length:", accountInfo.data.length, "bytes");
      console.log("Account owner:", accountInfo.owner.toString());

      // Parsear datos básicos
      if (accountInfo.data.length >= 37) {
        const authority = new PublicKey(accountInfo.data.slice(8, 40));
        const total = accountInfo.data.readUInt16LE(40);
        const sold = accountInfo.data.readUInt16LE(42);
        const active = accountInfo.data[44] === 1;

        console.log("\nSale Details:");
        console.log("  Authority:", authority.toString());
        console.log("  Total Tokens:", total);
        console.log("  Tokens Sold:", sold);
        console.log("  Active:", active ? "Yes ✅" : "No ❌");

        if (active) {
          console.log("\n🎉 The sale is already active and ready for purchases!");
        }
      }

      return;
    }
  } catch (error) {
    console.log("\n📝 Sale does not exist yet. Creating...");
  }

  // 6. Crear instrucción init_sale
  console.log("\n⏳ Creating init_sale transaction...");

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: treasuryKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: salePda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: INIT_SALE_DISCRIMINATOR,
  });

  // 7. Enviar transacción
  const transaction = new Transaction().add(instruction);

  console.log("Sending transaction...");

  try {
    const signature = await connection.sendTransaction(transaction, [treasuryKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log("Transaction sent:", signature);
    console.log("Confirming...");

    await connection.confirmTransaction(signature, "confirmed");

    console.log("\n✅ Transaction confirmed!");

    // 8. Verificar la venta creada
    const accountInfo = await connection.getAccountInfo(salePda);
    if (accountInfo && accountInfo.data.length >= 37) {
      const authority = new PublicKey(accountInfo.data.slice(8, 40));
      const total = accountInfo.data.readUInt16LE(40);
      const sold = accountInfo.data.readUInt16LE(42);
      const active = accountInfo.data[44] === 1;

      console.log("\n🎉 Sale initialized successfully!");
      console.log("Sale Details:");
      console.log("  Authority:", authority.toString());
      console.log("  Total Tokens:", total);
      console.log("  Tokens Sold:", sold);
      console.log("  Active:", active ? "Yes ✅" : "No ❌");
      console.log("\n✨ Users can now purchase tokens from the marketplace!");
      console.log("🔗 Sale Address:", salePda.toString());
    }
  } catch (error) {
    console.error("\n❌ Error sending transaction:");
    console.error(error);
    if (error.logs) {
      console.error("\nProgram logs:");
      error.logs.forEach((log) => console.error(log));
    }
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:");
    console.error(error.message || error);
    process.exit(1);
  });
