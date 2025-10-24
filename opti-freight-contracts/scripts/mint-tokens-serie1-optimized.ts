import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  Connection,
} from "@solana/web3.js";
import {
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import bs58 from "bs58";
import fs from "fs";

// Configuración
const MINT_WALLET_PATH = "/home/rocio/opti-f/mint-wallet.json";
const SERIE_NUMBER = 1;
const SERIE_NAME = "Opti-Freight Serie 1";
const SERIE_SYMBOL = "OPTIF1";
const TOTAL_TOKENS = 1000;
const DECIMALS = 0; // 0 decimales = tokens enteros no divisibles

async function main() {
  console.log(`🚀 Minting ${TOTAL_TOKENS} tokens for ${SERIE_NAME}...\n`);

  // Setup connection
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Leer keypair desde archivo
  const keypairFile = fs.readFileSync(MINT_WALLET_PATH, "utf-8");
  const secretKeyArray = JSON.parse(keypairFile);
  const treasuryKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));

  console.log("Treasury Wallet:", treasuryKeypair.publicKey.toString());

  // 1. Crear el mint (token)
  console.log("\n1️⃣ Creating token mint...");
  const mint = await createMint(
    connection,
    treasuryKeypair,
    treasuryKeypair.publicKey, // mint authority
    treasuryKeypair.publicKey, // freeze authority
    DECIMALS // 0 decimales
  );

  console.log("✅ Token Mint created:", mint.toString());

  // 2. Crear/obtener cuenta de token para la tesorería
  console.log("\n2️⃣ Creating token account for treasury...");
  const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    treasuryKeypair,
    mint,
    treasuryKeypair.publicKey
  );

  console.log("✅ Treasury Token Account:", treasuryTokenAccount.address.toString());

  // 3. Mintear todos los tokens a la tesorería
  console.log(`\n3️⃣ Minting ${TOTAL_TOKENS} tokens...`);
  const mintSignature = await mintTo(
    connection,
    treasuryKeypair,
    mint,
    treasuryTokenAccount.address,
    treasuryKeypair,
    TOTAL_TOKENS // Mintear todos los tokens
  );

  console.log("✅ Minted", TOTAL_TOKENS, "tokens. Signature:", mintSignature);

  // 4. Guardar información
  const tokenData = {
    serie: SERIE_NUMBER,
    name: SERIE_NAME,
    symbol: SERIE_SYMBOL,
    decimals: DECIMALS,
    totalSupply: TOTAL_TOKENS,
    mintAddress: mint.toString(),
    treasuryWallet: treasuryKeypair.publicKey.toString(),
    treasuryTokenAccount: treasuryTokenAccount.address.toString(),
    availableTokens: TOTAL_TOKENS,
    createdAt: new Date().toISOString(),
    mintSignature,
  };

  fs.writeFileSync(
    `./tokens-serie${SERIE_NUMBER}.json`,
    JSON.stringify(tokenData, null, 2)
  );

  console.log(`\n📄 Token info saved to: tokens-serie${SERIE_NUMBER}.json`);
  console.log(`\n🎉 Done! Total cost: ~0.01 SOL`);
  console.log(`💰 Tokens are now ready to be sold!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
