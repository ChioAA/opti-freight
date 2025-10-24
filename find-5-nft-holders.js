const { Connection, PublicKey } = require('./opti-freight-frontend/node_modules/@solana/web3.js');
const { AnchorProvider, Program } = require('./opti-freight-frontend/node_modules/@coral-xyz/anchor');

const SOLANA_RPC = 'https://api.devnet.solana.com';
const assetNftIdl = require('./opti-freight-frontend/src/lib/anchor/idl/asset_nft.json');

async function findNFTHolders() {
  const connection = new Connection(SOLANA_RPC, 'confirmed');

  console.log('🔍 Consultando contrato para encontrar los 5 NFTs y sus holders...');
  console.log('');

  try {
    // PASO 1: Consultar el contrato para obtener todos los NFTs minteados
    const provider = new AnchorProvider(connection, {}, { commitment: 'confirmed' });
    const program = new Program(assetNftIdl, provider);
    const trailerAssets = await program.account.trailerAsset.all();

    console.log(`📊 Total NFTs minteados según contrato: ${trailerAssets.length}`);
    console.log('');

    const holders = [];

    // PASO 2: Para cada NFT, encontrar quién lo tiene
    for (let i = 0; i < trailerAssets.length; i++) {
      const asset = trailerAssets[i];
      const mintAddress = asset.account.mint.toString();

      console.log(`NFT #${i + 1}: ${asset.account.name}`);
      console.log(`  Mint: ${mintAddress}`);

      // Buscar cuentas de token para este mint
      const tokenAccounts = await connection.getProgramAccounts(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: mintAddress } }
          ]
        }
      );

      if (tokenAccounts.length > 0) {
        for (const account of tokenAccounts) {
          const data = account.account.data;
          const ownerBytes = data.slice(32, 64);
          const owner = new PublicKey(ownerBytes).toString();
          const amountBytes = data.slice(64, 72);
          const amount = Number(amountBytes.readBigUInt64LE());

          if (amount > 0) {
            console.log(`  ✅ Holder: ${owner}`);
            holders.push({
              nftNumber: i + 1,
              nftName: asset.account.name,
              mintAddress: mintAddress,
              holderWallet: owner
            });
          }
        }
      } else {
        console.log(`  ⚠️ Sin holder encontrado`);
      }

      console.log('');
    }

    // PASO 3: Resumir holders
    console.log('========================================');
    console.log('RESUMEN DE WALLETS CON NFTs:');
    console.log('========================================');
    console.log('');

    const walletMap = new Map();
    holders.forEach(h => {
      if (!walletMap.has(h.holderWallet)) {
        walletMap.set(h.holderWallet, []);
      }
      walletMap.get(h.holderWallet).push(h);
    });

    let walletIndex = 1;
    for (const [wallet, nfts] of walletMap.entries()) {
      console.log(`Wallet #${walletIndex}: ${wallet}`);
      console.log(`  Total NFTs: ${nfts.length}`);
      nfts.forEach(nft => {
        console.log(`    - ${nft.nftName} (Mint: ${nft.mintAddress.slice(0, 8)}...)`);
      });
      console.log('');
      walletIndex++;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findNFTHolders();
