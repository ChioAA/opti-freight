# Opti-Freight Smart Contracts

[English](#english) | [Español](#español)

---

## English

Solana smart contracts for the trailer tokenization platform using Anchor Framework.

### Description

This project contains the smart contracts that power the Opti-Freight platform, enabling trailer tokenization, primary and secondary markets, and automated returns distribution on the Solana blockchain.

### Docker Development

This project uses Docker to avoid compatibility issues with GLIBC and other system dependencies.

#### Prerequisites

- Docker installed and running
- Docker Compose installed
- Solana CLI (optional, for wallet management)

#### Quick Commands

```bash
# Build Docker image (first time only)
docker compose build

# Initialize Anchor workspace
./anchor-dev.sh init

# Open interactive shell in container
./anchor-dev.sh shell

# Build programs
./anchor-dev.sh build

# Run tests
./anchor-dev.sh test

# Deploy to Devnet
./anchor-dev.sh deploy

# Stop container
./anchor-dev.sh stop
```

### Project Structure

```
opti-freight-contracts/
├── Dockerfile              # Docker image with Anchor
├── docker-compose.yml      # Docker Compose configuration
├── anchor-dev.sh          # Helper script for commands
├── Anchor.toml            # Anchor configuration
├── programs/              # Smart contracts
│   ├── asset-nft/        # Trailer tokenization
│   ├── primary-market/   # Primary market
│   ├── secondary-market/ # Secondary market
│   ├── returns-distribution/  # Returns distribution
│   ├── governance/       # Governance
│   └── opti-freight/     # Unified program (deployed)
└── tests/                # Integration tests
```

### Programs

#### 1. Asset NFT
Tokenizes trailers as NFTs with metadata including:
- Trailer series and identification
- Total value and token price
- APY and term duration
- Lock status

**Program ID**: `2ESdz2tgd6m8VPEcBnBPsndboKgMSDMQRUn94xD8YpUW`

#### 2. Primary Market
Handles initial token sales:
- Creates sales with fixed supply (1000 tokens per trailer)
- Price: $200 USDC per token
- Platform fee: 3%
- USDC payments via SPL Token transfers

**Program ID**: `Az1M72qgA5REQjiV789DrSqgMG1UGrL7puRXEqBCAHFQ`

#### 3. Secondary Market
P2P marketplace for token resale:
- Minimum resale price: $250 USDC ($200 + $50 penalty)
- Platform fee: 3%
- Penalty enforced on-chain

**Program ID**: `SECNdNgfnX8e4Qb1XAJ7H5YphWE87XKmWrk3nkzD8Vz`

#### 4. Returns Distribution
Distributes monthly returns to token holders:
- Distribution on the 20th of each month
- Prorated based on token ownership (1000 tokens = 100%)
- Direct USDC transfers from pool

**Program ID**: `DVfDdWLdsin4LGgor4B1nNQTSe4oi5F4cfmRVafpeMog`

#### 5. Governance
Administrative and governance functions.

**Program ID**: `GOVERNcaWJxH5YM3p8k6mwUhY7LzASwYxNzmgXzD4z`

#### 6. Opti-Freight (Unified Program)
**Currently deployed and used by frontend**

Unified program combining all functionalities:
- Primary market operations
- Secondary market operations
- Returns distribution
- Single deployment for simplified integration

**Program ID**: `HAsA9cM5SRhGKNNrQy9c7JF3rCsGwRC6A5ycNbKxpnWU`

### Development Workflow

1. **Develop**: Edit code in `programs/`
2. **Build**: `./anchor-dev.sh build`
3. **Test**: `./anchor-dev.sh test`
4. **Deploy**: `./anchor-dev.sh deploy`

### Building Programs

```bash
# Build all programs
./anchor-dev.sh build

# Or inside container shell
./anchor-dev.sh shell
anchor build
```

### Running Tests

```bash
# Run all tests
./anchor-dev.sh test

# Run specific test file
./anchor-dev.sh shell
anchor test tests/my-test.ts
```

### Deployment

#### Deploy to Devnet

```bash
# Make sure you have SOL in your wallet
solana airdrop 2

# Deploy programs
./anchor-dev.sh deploy
```

#### Deploy to Mainnet

1. Update `Anchor.toml` cluster to `mainnet`
2. Ensure wallet has sufficient SOL
3. Run deployment:
```bash
anchor deploy --provider.cluster mainnet
```

### Program Accounts

#### Sale Account (Primary Market)
```rust
pub struct Sale {
    pub authority: Pubkey,    // Sale creator
    pub price: u64,          // Price per token in USDC
    pub total: u16,          // Total tokens (1000)
    pub sold: u16,           // Tokens sold
    pub active: bool,        // Sale status
    pub bump: u8,            // PDA bump
}
```

#### Listing Account (Secondary Market)
```rust
pub struct Listing {
    pub seller: Pubkey,      // Token seller
    pub price: u64,          // Price per token (min $250)
    pub amount: u16,         // Tokens available
    pub active: bool,        // Listing status
    pub bump: u8,            // PDA bump
}
```

#### Trailer Asset (NFT)
```rust
pub struct TrailerAsset {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub series: String,
    pub total_value: u64,
    pub token_price: u64,
    pub total_tokens: u16,
    pub tokens_sold: u16,
    pub apy: u16,
    pub term_years: u8,
    pub is_locked: bool,
    pub created_at: i64,
    pub expiry_at: i64,
    pub bump: u8,
}
```

### Important Notes

- Container mounts your Solana wallet in read-only mode
- Changes in `programs/` are immediately reflected in container
- Compiled binaries are saved in `target/`
- Use the unified `opti-freight` program for production

### Troubleshooting

#### Container won't start
```bash
docker compose down
docker compose up -d
```

#### Clean everything and start fresh
```bash
docker compose down -v
docker compose build --no-cache
```

#### View container logs
```bash
./anchor-dev.sh logs
```

#### Build errors
```bash
# Clean build artifacts
rm -rf target/
./anchor-dev.sh build
```

#### Deployment fails
- Ensure wallet has sufficient SOL
- Check network connection
- Verify program IDs in `Anchor.toml`

### Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [SPL Token Documentation](https://spl.solana.com/token)

### Security Considerations

- All monetary values use u64 with proper overflow checks
- PDA (Program Derived Addresses) for secure account management
- Authority checks on all administrative functions
- Minimum price enforcement on secondary market
- Time-based restrictions on returns distribution

### Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create a branch for your feature
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### License

This project is private and confidential.

---

## Español

Contratos inteligentes de Solana para la plataforma de tokenizacion de trailers usando Anchor Framework.

### Descripcion

Este proyecto contiene los contratos inteligentes que impulsan la plataforma Opti-Freight, permitiendo la tokenizacion de trailers, mercados primarios y secundarios, y distribucion automatica de retornos en la blockchain de Solana.

### Desarrollo con Docker

Este proyecto usa Docker para evitar problemas de compatibilidad con GLIBC y otras dependencias del sistema.

#### Pre-requisitos

- Docker instalado y funcionando
- Docker Compose instalado
- Solana CLI (opcional, para manejo de wallets)

#### Comandos Rapidos

```bash
# Construir imagen Docker (solo la primera vez)
docker compose build

# Inicializar workspace de Anchor
./anchor-dev.sh init

# Abrir shell interactivo en el contenedor
./anchor-dev.sh shell

# Construir los programas
./anchor-dev.sh build

# Ejecutar tests
./anchor-dev.sh test

# Deployar a Devnet
./anchor-dev.sh deploy

# Detener el contenedor
./anchor-dev.sh stop
```

### Estructura del Proyecto

```
opti-freight-contracts/
├── Dockerfile              # Imagen Docker con Anchor
├── docker-compose.yml      # Configuracion de Docker Compose
├── anchor-dev.sh          # Script helper para comandos
├── Anchor.toml            # Configuracion de Anchor
├── programs/              # Contratos inteligentes
│   ├── asset-nft/        # Tokenizacion de trailers
│   ├── primary-market/   # Mercado primario
│   ├── secondary-market/ # Mercado secundario
│   ├── returns-distribution/  # Distribucion de retornos
│   ├── governance/       # Gobernanza
│   └── opti-freight/     # Programa unificado (desplegado)
└── tests/                # Tests de integracion
```

### Programas

#### 1. Asset NFT
Tokeniza trailers como NFTs con metadata incluyendo:
- Serie e identificacion del trailer
- Valor total y precio por token
- APY y duracion del termino
- Estado de bloqueo

**Program ID**: `2ESdz2tgd6m8VPEcBnBPsndboKgMSDMQRUn94xD8YpUW`

#### 2. Primary Market
Maneja ventas iniciales de tokens:
- Crea ventas con suministro fijo (1000 tokens por trailer)
- Precio: $200 USDC por token
- Comision de plataforma: 3%
- Pagos en USDC via transferencias SPL Token

**Program ID**: `Az1M72qgA5REQjiV789DrSqgMG1UGrL7puRXEqBCAHFQ`

#### 3. Secondary Market
Mercado P2P para reventa de tokens:
- Precio minimo de reventa: $250 USDC ($200 + $50 de penalizacion)
- Comision de plataforma: 3%
- Penalizacion forzada en la blockchain

**Program ID**: `SECNdNgfnX8e4Qb1XAJ7H5YphWE87XKmWrk3nkzD8Vz`

#### 4. Returns Distribution
Distribuye retornos mensuales a los holders de tokens:
- Distribucion el dia 20 de cada mes
- Prorrateado segun propiedad de tokens (1000 tokens = 100%)
- Transferencias directas de USDC desde el pool

**Program ID**: `DVfDdWLdsin4LGgor4B1nNQTSe4oi5F4cfmRVafpeMog`

#### 5. Governance
Funciones administrativas y de gobernanza.

**Program ID**: `GOVERNcaWJxH5YM3p8k6mwUhY7LzASwYxNzmgXzD4z`

#### 6. Opti-Freight (Programa Unificado)
**Actualmente desplegado y usado por el frontend**

Programa unificado que combina todas las funcionalidades:
- Operaciones de mercado primario
- Operaciones de mercado secundario
- Distribucion de retornos
- Despliegue unico para integracion simplificada

**Program ID**: `HAsA9cM5SRhGKNNrQy9c7JF3rCsGwRC6A5ycNbKxpnWU`

### Workflow de Desarrollo

1. **Desarrollar**: Edita codigo en `programs/`
2. **Construir**: `./anchor-dev.sh build`
3. **Probar**: `./anchor-dev.sh test`
4. **Deployar**: `./anchor-dev.sh deploy`

### Construir Programas

```bash
# Construir todos los programas
./anchor-dev.sh build

# O dentro del shell del contenedor
./anchor-dev.sh shell
anchor build
```

### Ejecutar Tests

```bash
# Ejecutar todos los tests
./anchor-dev.sh test

# Ejecutar archivo de test especifico
./anchor-dev.sh shell
anchor test tests/my-test.ts
```

### Despliegue

#### Desplegar a Devnet

```bash
# Asegurate de tener SOL en tu wallet
solana airdrop 2

# Desplegar programas
./anchor-dev.sh deploy
```

#### Desplegar a Mainnet

1. Actualiza `Anchor.toml` cluster a `mainnet`
2. Asegura que la wallet tenga suficiente SOL
3. Ejecuta el despliegue:
```bash
anchor deploy --provider.cluster mainnet
```

### Cuentas de Programa

#### Cuenta Sale (Mercado Primario)
```rust
pub struct Sale {
    pub authority: Pubkey,    // Creador de la venta
    pub price: u64,          // Precio por token en USDC
    pub total: u16,          // Total de tokens (1000)
    pub sold: u16,           // Tokens vendidos
    pub active: bool,        // Estado de la venta
    pub bump: u8,            // PDA bump
}
```

#### Cuenta Listing (Mercado Secundario)
```rust
pub struct Listing {
    pub seller: Pubkey,      // Vendedor de tokens
    pub price: u64,          // Precio por token (min $250)
    pub amount: u16,         // Tokens disponibles
    pub active: bool,        // Estado del listado
    pub bump: u8,            // PDA bump
}
```

#### Trailer Asset (NFT)
```rust
pub struct TrailerAsset {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub series: String,
    pub total_value: u64,
    pub token_price: u64,
    pub total_tokens: u16,
    pub tokens_sold: u16,
    pub apy: u16,
    pub term_years: u8,
    pub is_locked: bool,
    pub created_at: i64,
    pub expiry_at: i64,
    pub bump: u8,
}
```

### Notas Importantes

- El contenedor monta tu wallet de Solana en modo read-only
- Los cambios en `programs/` se reflejan inmediatamente en el contenedor
- Los binarios compilados se guardan en `target/`
- Usa el programa unificado `opti-freight` para produccion

### Troubleshooting

#### Container no inicia
```bash
docker compose down
docker compose up -d
```

#### Limpiar todo y empezar de cero
```bash
docker compose down -v
docker compose build --no-cache
```

#### Ver logs del contenedor
```bash
./anchor-dev.sh logs
```

#### Errores de compilacion
```bash
# Limpiar artefactos de compilacion
rm -rf target/
./anchor-dev.sh build
```

#### Falla el despliegue
- Asegura que la wallet tenga suficiente SOL
- Verifica la conexion de red
- Verifica los program IDs en `Anchor.toml`

### Recursos

- [Documentacion de Anchor](https://www.anchor-lang.com/)
- [Documentacion de Solana](https://docs.solana.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Documentacion SPL Token](https://spl.solana.com/token)

### Consideraciones de Seguridad

- Todos los valores monetarios usan u64 con verificaciones de desbordamiento
- PDA (Program Derived Addresses) para manejo seguro de cuentas
- Verificaciones de autoridad en todas las funciones administrativas
- Aplicacion de precio minimo en mercado secundario
- Restricciones basadas en tiempo para distribucion de retornos

### Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Escribe tests para nueva funcionalidad
4. Asegura que todos los tests pasen
5. Envia un pull request

### Licencia

Este proyecto es privado y confidencial.
