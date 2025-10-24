/**
 * Script para inicializar la venta en el smart contract
 * Este script debe ejecutarse una vez para configurar la venta de 1000 tokens
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Cargar variables de entorno desde el frontend
const envPath = path.join(__dirname, "../../opti-freight-frontend/.env.local");
dotenv.config({ path: envPath });

// Importar el IDL
const optiFreightIdl = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/opti_freight.json"), "utf-8")
);

const PROGRAM_ID = new PublicKey("HAsA9cM5SRhGKNNrQy9c7JF3rCsGwRC6A5ycNbKxpnWU");

async function main() {
  console.log("🚀 Initializing Sale for Opti-Freight Serie 1\n");

  // 1. Configurar conexión
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com",
    "confirmed"
  );

  // 2. Cargar el keypair del treasury
  if (!process.env.TREASURY_PRIVATE_KEY) {
    throw new Error("TREASURY_PRIVATE_KEY not found in .env.local");
  }

  const secretKey = bs58.decode(process.env.TREASURY_PRIVATE_KEY);
  const treasuryKeypair = Keypair.fromSecretKey(secretKey);

  console.log("Treasury Address:", treasuryKeypair.publicKey.toString());

  // 3. Configurar el provider y programa
  const wallet = new anchor.Wallet(treasuryKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = new Program(optiFreightIdl as any, provider);

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
        rent: SYSVAR_RENT_PUBKEY,
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
