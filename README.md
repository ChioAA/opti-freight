# OptiFreight 🚚

### Democratizing Freight Investment Through Real World Asset Tokenization

[English](#english) | [Español](#español)

---

<a name="english"></a>
## English

### Overview

**OptiFreight** democratizes investment in the transportation sector by tokenizing trucks as Real World Assets (RWAs), enabling small investors to own fractions of freight fleets and participate in logistics sector returns, previously exclusive to large capital holders.

### The Problem

The logistics and freight industry generates billions in annual revenue, but investment opportunities are limited to:
- Large corporations with significant capital
- Fleet owners with assets worth hundreds of thousands
- Institutional investors with exclusive access

Small investors are completely excluded from this profitable market.

### Our Solution

OptiFreight leverages blockchain technology and asset tokenization to:

1. **Fractional Ownership**: Convert trucks into digital tokens (NFTs) representing ownership shares
2. **Accessible Investment**: Minimum investment of just $200 per token
3. **Monthly Returns**: Automatic distribution of operational profits to token holders
4. **Liquid Secondary Market**: Buy and sell tokens with minimal friction
5. **Transparent Governance**: Token holders vote on fleet decisions

### How It Works

```
Truck Asset → Tokenization (1000 tokens/truck) → Primary Market Sale ($200/token)
                                                          ↓
Token Holders ← Monthly Dividends ← Fleet Operations Revenue
                                                          ↓
                                          Secondary Market Trading
```

### Technology Stack

#### Smart Contracts (Solana)
- **Asset NFT Program**: Tokenizes physical trucks as digital assets
- **Primary Market**: Handles initial token sales
- **Secondary Market**: Peer-to-peer token trading with anti-speculation penalties
- **Returns Distribution**: Automated monthly profit sharing
- **Governance**: Decentralized decision-making for token holders

#### Frontend (Next.js)
- Modern, responsive web application
- Wallet integration (Phantom, Solflare)
- Real-time portfolio tracking
- Market analytics dashboard

### Key Features

#### For Investors
- 💰 **Low Entry Barrier**: Start investing with just $200
- 📊 **Transparent Returns**: Track your dividends in real-time
- 🔄 **Liquidity**: Trade tokens on secondary market anytime
- 🗳️ **Governance Rights**: Vote on fleet expansion and operations
- 📈 **Portfolio Dashboard**: Monitor all your truck investments

#### For Truck Owners
- 💵 **Quick Capital**: Tokenize assets and raise funds fast
- 🌍 **Global Reach**: Access international investor base
- 📝 **Regulatory Compliance**: Built-in KYC/AML integration
- 🔐 **Asset Security**: Blockchain-verified ownership

#### Market Mechanics
- **Primary Market Fee**: 3% platform fee on initial sales
- **Anti-Speculation Penalty**: $50 per token on secondary sales (promotes long-term holding)
- **Minimum Resale Price**: $250 (prevents token devaluation)
- **Monthly Distribution**: Automatic on the 20th of each month

### Project Structure

```
opti-freight/
├── opti-freight-contracts/     # Solana smart contracts (Anchor framework)
│   ├── programs/
│   │   ├── asset-nft/          # NFT tokenization
│   │   ├── primary-market/     # Initial token sales
│   │   ├── secondary-market/   # P2P trading
│   │   ├── returns-distribution/ # Profit sharing
│   │   └── governance/         # DAO voting
│   └── tests/                  # Comprehensive test suite
└── opti-freight-frontend/      # Next.js web application
    ├── src/
    │   ├── components/         # React components
    │   ├── pages/              # Application routes
    │   └── lib/                # Utilities and SDK integration
    └── public/                 # Static assets
```

### Getting Started

#### Prerequisites
- Node.js 18+
- Rust 1.70+
- Solana CLI
- Anchor Framework
- Docker (optional)

#### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ChioAA/opti-freight.git
cd opti-freight
```

2. **Install contract dependencies**
```bash
cd opti-freight-contracts
npm install
```

3. **Build smart contracts**
```bash
anchor build
```

4. **Run tests**
```bash
anchor test
```

5. **Install frontend dependencies**
```bash
cd ../opti-freight-frontend
npm install
```

6. **Run development server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

#### Docker Deployment (Alternative)

```bash
cd opti-freight-contracts
docker-compose up
```

### Testing

The project includes comprehensive tests covering:
- Primary market token sales
- Secondary market trading with penalties
- Monthly distribution logic
- Edge cases and error handling
- Governance voting mechanisms

```bash
cd opti-freight-contracts
npm test
```

### Roadmap

- [x] Smart contract architecture
- [x] Primary market implementation
- [x] Secondary market with anti-speculation
- [x] Monthly returns distribution
- [x] Basic governance module
- [ ] Frontend MVP
- [ ] Mainnet deployment
- [ ] KYC/AML integration
- [ ] Mobile application
- [ ] Multi-asset support (trailers, containers, etc.)
- [ ] Insurance integration
- [ ] Advanced analytics dashboard

### Security

- All smart contracts audited by [To be scheduled]
- Multi-signature wallet for treasury
- Time-locked governance proposals
- Emergency pause functionality

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

### Contact

- Website: [optifreight.io](https://optifreight.io)
- Twitter: [@OptiFreight](https://twitter.com/optifreight)
- Discord: [Join our community](https://discord.gg/optifreight)
- Email: info@optifreight.io

---

<a name="español"></a>
## Español

### Descripción General

**OptiFreight** democratiza la inversión en el sector de transporte mediante la tokenización de camiones como Activos del Mundo Real (RWAs), permitiendo a pequeños inversores poseer fracciones de flotas de carga y participar en los rendimientos del sector logístico, anteriormente exclusivo de grandes capitales.

### El Problema

La industria logística y de transporte de carga genera miles de millones en ingresos anuales, pero las oportunidades de inversión están limitadas a:
- Grandes corporaciones con capital significativo
- Propietarios de flotas con activos valuados en cientos de miles
- Inversionistas institucionales con acceso exclusivo

Los pequeños inversores están completamente excluidos de este mercado rentable.

### Nuestra Solución

OptiFreight aprovecha la tecnología blockchain y la tokenización de activos para:

1. **Propiedad Fraccionada**: Convertir camiones en tokens digitales (NFTs) que representan acciones de propiedad
2. **Inversión Accesible**: Inversión mínima de solo $200 por token
3. **Retornos Mensuales**: Distribución automática de ganancias operativas a los tenedores de tokens
4. **Mercado Secundario Líquido**: Compra y vende tokens con fricción mínima
5. **Gobernanza Transparente**: Los tenedores de tokens votan en decisiones de la flota

### Cómo Funciona

```
Activo Camión → Tokenización (1000 tokens/camión) → Venta Mercado Primario ($200/token)
                                                              ↓
Tenedores de Tokens ← Dividendos Mensuales ← Ingresos Operaciones de Flota
                                                              ↓
                                              Mercado Secundario de Trading
```

### Stack Tecnológico

#### Contratos Inteligentes (Solana)
- **Programa Asset NFT**: Tokeniza camiones físicos como activos digitales
- **Mercado Primario**: Gestiona ventas iniciales de tokens
- **Mercado Secundario**: Trading peer-to-peer con penalizaciones anti-especulación
- **Distribución de Retornos**: Reparto automático de ganancias mensuales
- **Gobernanza**: Toma de decisiones descentralizada para tenedores de tokens

#### Frontend (Next.js)
- Aplicación web moderna y responsiva
- Integración con wallets (Phantom, Solflare)
- Seguimiento de portafolio en tiempo real
- Dashboard de analíticas de mercado

### Características Principales

#### Para Inversores
- 💰 **Barrera de Entrada Baja**: Comienza invirtiendo con solo $200
- 📊 **Retornos Transparentes**: Rastrea tus dividendos en tiempo real
- 🔄 **Liquidez**: Opera tokens en el mercado secundario en cualquier momento
- 🗳️ **Derechos de Gobernanza**: Vota sobre expansión de flota y operaciones
- 📈 **Dashboard de Portafolio**: Monitorea todas tus inversiones en camiones

#### Para Propietarios de Camiones
- 💵 **Capital Rápido**: Tokeniza activos y levanta fondos rápidamente
- 🌍 **Alcance Global**: Accede a base de inversores internacional
- 📝 **Cumplimiento Regulatorio**: Integración KYC/AML incorporada
- 🔐 **Seguridad de Activos**: Propiedad verificada por blockchain

#### Mecánicas del Mercado
- **Tarifa Mercado Primario**: 3% de comisión de plataforma en ventas iniciales
- **Penalización Anti-Especulación**: $50 por token en ventas secundarias (promueve tenencia a largo plazo)
- **Precio Mínimo de Reventa**: $250 (previene devaluación de tokens)
- **Distribución Mensual**: Automática el día 20 de cada mes

### Estructura del Proyecto

```
opti-freight/
├── opti-freight-contracts/     # Contratos inteligentes Solana (framework Anchor)
│   ├── programs/
│   │   ├── asset-nft/          # Tokenización NFT
│   │   ├── primary-market/     # Ventas iniciales de tokens
│   │   ├── secondary-market/   # Trading P2P
│   │   ├── returns-distribution/ # Reparto de ganancias
│   │   └── governance/         # Votación DAO
│   └── tests/                  # Suite de pruebas completa
└── opti-freight-frontend/      # Aplicación web Next.js
    ├── src/
    │   ├── components/         # Componentes React
    │   ├── pages/              # Rutas de aplicación
    │   └── lib/                # Utilidades e integración SDK
    └── public/                 # Activos estáticos
```

### Comenzar

#### Prerequisitos
- Node.js 18+
- Rust 1.70+
- Solana CLI
- Anchor Framework
- Docker (opcional)

#### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/ChioAA/opti-freight.git
cd opti-freight
```

2. **Instalar dependencias de contratos**
```bash
cd opti-freight-contracts
npm install
```

3. **Compilar contratos inteligentes**
```bash
anchor build
```

4. **Ejecutar pruebas**
```bash
anchor test
```

5. **Instalar dependencias del frontend**
```bash
cd ../opti-freight-frontend
npm install
```

6. **Ejecutar servidor de desarrollo**
```bash
npm run dev
```

Visita `http://localhost:3000` para ver la aplicación.

#### Deployment con Docker (Alternativa)

```bash
cd opti-freight-contracts
docker-compose up
```

### Pruebas

El proyecto incluye pruebas exhaustivas que cubren:
- Ventas de tokens en mercado primario
- Trading en mercado secundario con penalizaciones
- Lógica de distribución mensual
- Casos extremos y manejo de errores
- Mecanismos de votación de gobernanza

```bash
cd opti-freight-contracts
npm test
```

### Hoja de Ruta

- [x] Arquitectura de contratos inteligentes
- [x] Implementación mercado primario
- [x] Mercado secundario con anti-especulación
- [x] Distribución de retornos mensuales
- [x] Módulo básico de gobernanza
- [ ] MVP del frontend
- [ ] Deployment en Mainnet
- [ ] Integración KYC/AML
- [ ] Aplicación móvil
- [ ] Soporte multi-activos (trailers, contenedores, etc.)
- [ ] Integración de seguros
- [ ] Dashboard de analíticas avanzadas

### Seguridad

- Todos los contratos inteligentes auditados por [Por programar]
- Wallet multi-firma para tesorería
- Propuestas de gobernanza con time-lock
- Funcionalidad de pausa de emergencia

### Contribuir

¡Damos la bienvenida a contribuciones! Por favor ver [CONTRIBUTING.md](CONTRIBUTING.md) para detalles.

### Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver archivo [LICENSE](LICENSE) para detalles.

### Contacto

- Sitio web: [optifreight.io](https://optifreight.io)
- Twitter: [@OptiFreight](https://twitter.com/optifreight)
- Discord: [Únete a nuestra comunidad](https://discord.gg/optifreight)
- Email: info@optifreight.io
