const { Connection, PublicKey } = require('@solana/web3.js');
const { AnchorProvider, Program } = require('@coral-xyz/anchor');

const SOLANA_RPC = 'https://api.devnet.solana.com';
const ASSET_NFT_PROGRAM_ID = '2ESjYkkwqZYBkAA6gBprX9xaRhqgPVyMyZLkGVAq7YtU';

// IDL simplificado (solo necesitamos la estructura de la cuenta)
const assetNftIdl = require('./opti-freight-frontend/src/lib/anchor/idl/asset_nft.json');

async function findNFTHolders() {
  const connection = new Connection(SOLANA_RPC, 'confirmed');

  console.log('🔍 Buscando todos los NFTs de OptiFreight Serie 1...');
  console.log('');

  try {
    // Crear provider sin wallet (solo lectura)
    const provider = new AnchorProvider(
      connection,
      {},
      { commitment: 'confirmed' }
    );

    // Cargar programa
    const program = new Program(assetNftIdl, provider);

    // Obtener todas las cuentas TrailerAsset
    const trailerAssets = await program.account.trailerAsset.all();

    console.log(`📊 Total de NFTs minteados: ${trailerAssets.length}`);
    console.log('');

    // Para cada NFT, obtener el holder
    const holders = new Map();

    for (let i = 0; i < trailerAssets.length; i++) {
      const asset = trailerAssets[i];
      const mintAddress = asset.account.mint.toString();

      console.log(`NFT #${i + 1}:`);
      console.log(`  Mint: ${mintAddress}`);
      console.log(`  Nombre: ${asset.account.name}`);

      // Buscar quien tiene este NFT
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new PublicKey(mintAddress),
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      ).catch(() => ({ value: [] }));

      // Buscar por mint
      const allTokenAccounts = await connection.getProgramAccounts(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: mintAddress } }
          ]
        }
      );

      if (allTokenAccounts.length > 0) {
        for (const account of allTokenAccounts) {
          const data = account.account.data;
          const ownerBytes = data.slice(32, 64);
          const owner = new PublicKey(ownerBytes).toString();
          const amountBytes = data.slice(64, 72);
          const amount = Number(amountBytes.readBigUInt64LE());

          if (amount > 0) {
            console.log(`  ✅ Owner: ${owner} (${amount} NFT)`);

            if (!holders.has(owner)) {
              holders.set(owner, []);
            }
            holders.get(owner).push({
              mint: mintAddress,
              name: asset.account.name
            });
          }
        }
      } else {
        console.log(`  ⚠️ No se encontró holder (puede estar en proceso)`);
      }

      console.log('');
    }

    console.log('');
    console.log('========================================');
    console.log('RESUMEN DE HOLDERS:');
    console.log('========================================');
    console.log('');

    let holderIndex = 1;
    for (const [wallet, nfts] of holders.entries()) {
      console.log(`${holderIndex}. Wallet: ${wallet}`);
      console.log(`   Total NFTs: ${nfts.length}`);
      nfts.forEach((nft, idx) => {
        console.log(`   - NFT ${idx + 1}: ${nft.name}`);
        console.log(`     Mint: ${nft.mint}`);
      });
      console.log('');
      holderIndex++;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

findNFTHolders();
