#!/bin/bash

# Script para actualizar la imagen del NFT con el hash de Arweave
# Uso: ./update-nft-image.sh <ARWEAVE_HASH>

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar el hash de Arweave"
    echo "Uso: ./update-nft-image.sh <ARWEAVE_HASH>"
    echo "Ejemplo: ./update-nft-image.sh abc123xyz456"
    exit 1
fi

ARWEAVE_HASH=$1
FILE_PATH="opti-freight-frontend/src/hooks/use-mint-nft.ts"

echo "🔧 Actualizando imagen del NFT..."
echo "📍 Hash de Arweave: $ARWEAVE_HASH"

# Reemplazar la URL de la imagen
sed -i "s|imageUri: 'https://i.imgur.com/placeholder.jpg'.*|imageUri: 'https://arweave.net/$ARWEAVE_HASH',|" $FILE_PATH

echo "✅ Imagen actualizada exitosamente!"
echo "📄 Archivo: $FILE_PATH"
echo "🌐 URL: https://arweave.net/$ARWEAVE_HASH"
echo ""
echo "📝 Ahora puedes hacer:"
echo "   git add ."
echo "   git commit -m 'Update NFT image with Arweave hash'"
echo "   git push"
