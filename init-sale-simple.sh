#!/bin/bash

# Script para inicializar la venta de OptiFreight Serie 1
# Usando solana-keygen y solana CLI directamente

set -e

echo "🚀 Inicializando venta de OptiFreight Serie 1..."
echo ""

# Configuración
PROGRAM_ID="7x4rNdNN9Szce8qfasDGiV3srApWcJ339t8iGAyKjrga"
TREASURY_WALLET="$HOME/.config/solana/opti-freight-wallet.json"
RPC_URL="https://api.devnet.solana.com"

# Verificar que existe el wallet
if [ ! -f "$TREASURY_WALLET" ]; then
    echo "❌ Error: No se encontró el wallet en $TREASURY_WALLET"
    exit 1
fi

# Obtener la public key del treasury
TREASURY_PUBKEY=$(solana-keygen pubkey "$TREASURY_WALLET")
echo "✅ Treasury Public Key: $TREASURY_PUBKEY"

# Verificar balance
BALANCE=$(solana balance "$TREASURY_PUBKEY" --url devnet | awk '{print $1}')
echo "✅ Balance: $BALANCE SOL"
echo ""

if (( $(echo "$BALANCE < 0.01" | bc -l) )); then
    echo "❌ Balance insuficiente. Necesitas al menos 0.01 SOL"
    echo "Ejecuta: solana airdrop 1 $TREASURY_PUBKEY --url devnet"
    exit 1
fi

# Derivar el Sale PDA
echo "📍 Derivando Sale PDA..."
# Necesitamos usar un script Node.js para derivar el PDA correctamente

cat > /tmp/derive-pda.js << 'EOF'
const { PublicKey } = require('@solana/web3.js');

const programId = new PublicKey(process.argv[2]);
const authority = new PublicKey(process.argv[3]);

const [salePda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from('sale'), authority.toBuffer()],
  programId
);

console.log(salePda.toString());
EOF

SALE_PDA=$(node /tmp/derive-pda.js "$PROGRAM_ID" "$TREASURY_PUBKEY")
echo "✅ Sale PDA: $SALE_PDA"
echo ""

# Verificar si la venta ya existe
echo "🔍 Verificando si la venta ya existe..."
if solana account "$SALE_PDA" --url devnet &>/dev/null; then
    echo "✅ ¡La venta ya existe!"
    solana account "$SALE_PDA" --url devnet
    exit 0
fi

echo "📝 La venta no existe aún."
echo ""
echo "⚠️  NOTA: Para inicializar la venta, necesitas usar Anchor CLI o un script TypeScript."
echo "El discriminador de init_sale es: [167, 179, 188, 155, 54, 187, 33, 205]"
echo ""
echo "Ejecuta el script init-sale-local.ts en el directorio frontend:"
echo "  cd opti-freight-frontend && npx tsx init-sale-local.ts"
echo ""
