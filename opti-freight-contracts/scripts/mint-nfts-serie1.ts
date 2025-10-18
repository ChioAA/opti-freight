import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress
} from "@solana/spl-token";
import bs58 from "bs58";
import fs from "fs";

// Configuración
const TREASURY_PRIVATE_KEY = "35Y28X2k6azBTfvKoDKnPcZcvzdmT5zxVpPfahXcwbepu8qPaNBjQJgLyN7Pd1YvwArD4jPKthjkPEQ6CGXC6F83";
const SERIE_NUMBER = 1;
const SERIE_NAME = "Opti-Freight Serie 1";
const SERIE_SYMBOL = "OPTIF-S1";
const TOTAL_NFTS = 1000;

async function main() {
  // Setup
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const secretKey = bs58.decode(TREASURY_PRIVATE_KEY);
  const treasuryKeypair = Keypair.fromSecretKey(secretKey);

  console.log("Treasury Wallet:", treasuryKeypair.publicKey.toString());
  console.log(`\nMinting ${TOTAL_NFTS} NFTs for ${SERIE_NAME}...\n`);

  const nftMints: string[] = [];

  for (let i = 1; i <= TOTAL_NFTS; i++) {
    try {
      // Crear un nuevo mint para cada NFT (supply = 1)
      const mintKeypair = Keypair.generate();

      const mint = await createMint(
        connection,
        treasuryKeypair,
        treasuryKeypair.publicKey, // mint authority
        treasuryKeypair.publicKey, // freeze authority
        0, // 0 decimales = NFT
        mintKeypair
      );

      // Crear cuenta de token asociada para la tesorería
      const tokenAccount = await createAssociatedTokenAccount(
        connection,
        treasuryKeypair,
        mint,
        treasuryKeypair.publicKey
      );

      // Mintear 1 token (NFT único)
      await mintTo(
        connection,
        treasuryKeypair,
        mint,
        tokenAccount,
        treasuryKeypair,
        1 // Solo 1 NFT
      );

      nftMints.push(mint.toString());

      if (i % 10 === 0) {
        console.log(`✅ Minted ${i}/${TOTAL_NFTS} NFTs`);
      }
    } catch (error) {
      console.error(`❌ Error minting NFT #${i}:`, error);
    }
  }

  console.log(`\n✅ Successfully minted ${nftMints.length} NFTs!`);

  // Guardar lista de NFTs en un archivo
  const nftData = {
    serie: SERIE_NUMBER,
    name: SERIE_NAME,
    symbol: SERIE_SYMBOL,
    totalNfts: TOTAL_NFTS,
    treasuryWallet: treasuryKeypair.publicKey.toString(),
    nftMints,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    `./nfts-serie${SERIE_NUMBER}.json`,
    JSON.stringify(nftData, null, 2)
  );

  console.log(`\n📄 NFT list saved to: nfts-serie${SERIE_NUMBER}.json`);
  console.log(`\n🎉 Done! You can now sell these NFTs.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
