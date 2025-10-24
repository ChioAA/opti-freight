/**
 * Script para inicializar la venta en el smart contract
 * Este script debe ejecutarse una vez para configurar la venta de 1000 tokens
 */

const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = require("@solana/web3.js");
const bs58 = require("bs58").default || require("bs58");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Cargar variables de entorno desde el frontend
const envPath = path.join(__dirname, "../../opti-freight-frontend/.env.local");
dotenv.config({ path: envPath });

// Importar el IDL
const optiFreightIdl = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/opti_freight.json"), "utf-8")
);

const PROGRAM_ID = new PublicKey("AoR4goYR4q6mR1X6gB51CX67EbgzGmSYd6eWPN4A4ddq");

async function main() {
  console.log("🚀 Initializing Sale for Opti-Freight Serie 1\n");

  // 1. Configurar conexión
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com",
    "confirmed"
  );

  // 2. Cargar el keypair del treasury
  let treasuryKeypair;

  // Intentar cargar desde la variable de entorno
  if (process.env.TREASURY_PRIVATE_KEY) {
    try {
      // Intentar como base58
      const secretKey = bs58.decode(process.env.TREASURY_PRIVATE_KEY);
      treasuryKeypair = Keypair.fromSecretKey(secretKey);
    } catch (e) {
      console.log("⚠️  Invalid TREASURY_PRIVATE_KEY format. Generating new keypair...");
      treasuryKeypair = Keypair.generate();
    }
  } else {
    console.log("⚠️  TREASURY_PRIVATE_KEY not found. Generating new keypair...");
    treasuryKeypair = Keypair.generate();
  }

  // Airdrop devnet SOL if balance is low
  const balance = await connection.getBalance(treasuryKeypair.publicKey);
  console.log("Current balance:", balance / 1e9, "SOL");

  if (balance < 0.1 * 1e9) {
    console.log("⏳ Requesting airdrop...");
    try {
      const signature = await connection.requestAirdrop(treasuryKeypair.publicKey, 1 * 1e9);
      await connection.confirmTransaction(signature);
      console.log("✅ Airdrop successful!");
    } catch (error) {
      console.log("⚠️  Airdrop failed, you may need to manually fund this wallet");
    }
  }

  console.log("Treasury Address:", treasuryKeypair.publicKey.toString());

  // 3. Configurar el provider y programa
  const wallet = new anchor.Wallet(treasuryKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = new anchor.Program(optiFreightIdl, PROGRAM_ID, provider);

  // 4. Derivar PDA para la venta
  const [salePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("sale"), treasuryKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );

  console.log("Sale PDA:", salePda.toString());
  console.log("Bump:", bump);

  // 5. Verificar si ya existe una venta
  try {
    const existingSale = await program.account.sale.fetch(salePda);
    console.log("\n✅ Sale already exists!");
    console.log("Sale Details:");
    console.log("  Authority:", existingSale.authority.toString());
    console.log("  Total Tokens:", existingSale.total);
    console.log("  Tokens Sold:", existingSale.sold);
    console.log("  Active:", existingSale.active ? "Yes ✅" : "No ❌");
    console.log("  Bump:", existingSale.bump);

    if (existingSale.active) {
      console.log("\n🎉 The sale is already active and ready for purchases!");
    } else {
      console.log("\n⚠️  The sale exists but is not active. You may need to activate it.");
    }

    return;
  } catch (error) {
    console.log("\n📝 Sale does not exist yet. Creating...");
  }

  // 6. Inicializar la venta
  console.log("\n⏳ Sending transaction to initialize sale...");

  try {
    const tx = await program.methods
      .initSale()
      .accounts({
        authority: treasuryKeypair.publicKey,
        sale: salePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Transaction confirmed:", tx);

    // 7. Verificar la venta creada
    const sale = await program.account.sale.fetch(salePda);
    console.log("\n🎉 Sale initialized successfully!");
    console.log("Sale Details:");
    console.log("  Authority:", sale.authority.toString());
    console.log("  Total Tokens:", sale.total);
    console.log("  Tokens Sold:", sale.sold);
    console.log("  Active:", sale.active ? "Yes ✅" : "No ❌");
    console.log("  Bump:", sale.bump);

    console.log("\n✨ Users can now purchase tokens from the marketplace!");
    console.log("🔗 Sale Address:", salePda.toString());
  } catch (error) {
    console.error("\n❌ Error initializing sale:");
    console.error(error);
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
    console.error(error);
    process.exit(1);
  });
