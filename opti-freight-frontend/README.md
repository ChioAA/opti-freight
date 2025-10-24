# Opti-Freight Frontend

[English](#english) | [Español](#español)

---

## English

Logistics asset tokenization platform (RWA) built with Next.js 15, React 18, Solana Web3.js and Anchor.

### Description

Opti-Freight is a Web3 platform that enables the tokenization of trailers and logistics assets on the Solana blockchain. Users can purchase tokens representing fractional ownership of trailers, trade them on a secondary market, and receive monthly returns based on asset performance.

### Main Features

- **Primary Market**: Purchase tokens from newly tokenized trailers
- **Secondary Market**: P2P trading of tokens between users
- **Returns Distribution**: Monthly claim of prorated earnings
- **Solana Integration**: Connection with wallets (Phantom, Solflare, etc.)
- **Smart Contracts**: Interaction with Anchor programs on Solana Devnet

### Prerequisites

- Node.js 18+ and npm
- A Solana wallet (Phantom, Solflare, etc.)
- Connection to Solana Devnet

### Installation

1. Clone the repository:
```bash
cd opti-freight-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
Create a `.env.local` file if you need custom configurations:
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

### Running in Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9002`

### Available Scripts

- `npm run dev` - Starts the development server on port 9002
- `npm run build` - Builds the application for production
- `npm run start` - Starts the production server
- `npm run lint` - Runs the linter
- `npm run typecheck` - Checks TypeScript types

### Project Structure

```
opti-freight-frontend/
├── src/
│   ├── app/                    # Routes and pages (Next.js App Router)
│   │   ├── app/               # Main application (requires authentication)
│   │   │   ├── dashboard/    # User dashboard
│   │   │   ├── marketplace/  # Token marketplace
│   │   │   └── portfolio/    # User portfolio
│   │   ├── page.tsx          # Home/login page
│   │   └── layout.tsx        # Main layout
│   ├── components/           # Reusable components
│   │   ├── auth/            # Authentication components
│   │   └── ui/              # UI components (shadcn/ui)
│   ├── contexts/            # React contexts
│   │   ├── auth-context.tsx # Authentication context
│   │   ├── wallet-context.tsx # Wallet context
│   │   └── anchor-context.tsx # Anchor/Solana context
│   ├── hooks/               # Custom hooks
│   │   ├── use-opti-freight.ts # Main hook for contract interaction
│   │   ├── use-solana-wallet.ts # Solana wallet hook
│   │   └── use-toast.ts     # Notification hook
│   └── lib/                 # Utilities and configuration
│       ├── anchor/          # Anchor configuration
│       └── utils.ts         # Utility functions
├── public/                  # Static files
├── package.json            # Project dependencies
└── README.md              # This file
```

### Technologies Used

#### Core
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Static typing

#### Blockchain
- **Solana Web3.js** - Solana blockchain interaction
- **Anchor** - Framework for Solana smart contracts
- **Wallet Adapter** - Solana wallet integration

#### UI/UX
- **Tailwind CSS** - CSS framework
- **shadcn/ui** - UI components
- **Radix UI** - Accessible UI primitives
- **Lucide React** - Icons

#### Forms and Validation
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Application Usage

#### 1. Connect Wallet

1. Open the application in your browser
2. Click on "Connect Wallet"
3. Select your wallet (Phantom, Solflare, etc.)
4. Authorize the connection

#### 2. Buy Tokens (Primary Market)

1. Go to "Marketplace"
2. Search for available trailers
3. Select the number of tokens
4. Confirm the transaction in your wallet
5. Price: $200 USDC per token + 3% fee

#### 3. Sell Tokens (Secondary Market)

1. Go to "Portfolio"
2. Select the tokens you want to sell
3. Set the price (minimum $250 USDC)
4. Create the listing
5. Note: A $50 penalty per token + 3% fee applies

#### 4. Claim Returns

1. Wait until the 20th of the month
2. Go to "Portfolio"
3. Click on "Claim Returns"
4. Returns are distributed proportionally according to your participation

### Contract Configuration

The frontend is configured to connect to the unified Opti-Freight program deployed on Solana Devnet:

- **Program ID**: `AoR4goYR4q6mR1X6gB51CX67EbgzGmSYd6eWPN4A4ddq`
- **USDC Mint**: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
- **Platform Wallet**: `468zRBWHvREsy67no7yVviW69i173dZt25XKsDqKeCNh`

You can find the configuration in `src/hooks/use-opti-freight.ts`

### Development

#### Adding New Features

1. UI components go in `src/components/`
2. Custom hooks go in `src/hooks/`
3. Pages go in `src/app/`
4. Contexts go in `src/contexts/`

#### Interacting with Contracts

Use the `useOptiFreight()` hook to interact with smart contracts:

```typescript
import { useOptiFreight } from '@/hooks/use-opti-freight';

function MyComponent() {
  const { buyPrimary, createListing, distributeMonthly } = useOptiFreight();

  // Buy tokens from primary market
  const handleBuy = async () => {
    const result = await buyPrimary(salePublicKey, 10);
    if (result.success) {
      console.log('Purchase successful:', result.signature);
    }
  };

  return (
    <button onClick={handleBuy}>Buy Tokens</button>
  );
}
```

### Common Issues

#### Error: "Wallet not connected"
- Make sure you have a Solana wallet installed
- Connect your wallet before making transactions

#### Error: "Insufficient funds"
- Verify you have enough SOL for transaction fees
- Verify you have enough USDC to buy tokens

#### Application doesn't load
- Verify all dependencies are installed: `npm install`
- Clear the cache: `rm -rf .next`
- Restart the development server

### Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

### License

This project is private and confidential.

### Contact

For questions or support, contact the Opti-Freight development team.

---

**Note**: This application is currently configured to work on Solana Devnet. To use on mainnet, update the configurations in the corresponding files.

---

## Español

Plataforma de tokenizacion de activos logisticos (RWA) construida con Next.js 15, React 18, Solana Web3.js y Anchor.

### Descripcion

Opti-Freight es una plataforma Web3 que permite la tokenizacion de trailers y activos logisticos en la blockchain de Solana. Los usuarios pueden comprar tokens que representan partes fraccionarias de trailers, comerciarlos en un mercado secundario, y recibir retornos mensuales basados en el rendimiento de los activos.

### Caracteristicas Principales

- **Mercado Primario**: Compra de tokens de trailers recien tokenizados
- **Mercado Secundario**: Comercio P2P de tokens entre usuarios
- **Distribucion de Retornos**: Reclamacion mensual de ganancias prorrateadas
- **Integracion con Solana**: Conexion con wallets (Phantom, Solflare, etc.)
- **Contratos Inteligentes**: Interaccion con programas Anchor en Solana Devnet

### Requisitos Previos

- Node.js 18+ y npm
- Una wallet de Solana (Phantom, Solflare, etc.)
- Conexion a Solana Devnet

### Instalacion

1. Clonar el repositorio:
```bash
cd opti-freight-frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno (opcional):
Crear un archivo `.env.local` si necesitas configuraciones personalizadas:
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

### Ejecucion en Desarrollo

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicacion estara disponible en `http://localhost:9002`

### Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo en el puerto 9002
- `npm run build` - Construye la aplicacion para produccion
- `npm run start` - Inicia el servidor de produccion
- `npm run lint` - Ejecuta el linter
- `npm run typecheck` - Verifica los tipos de TypeScript

### Estructura del Proyecto

```
opti-freight-frontend/
├── src/
│   ├── app/                    # Rutas y paginas (Next.js App Router)
│   │   ├── app/               # Aplicacion principal (requiere autenticacion)
│   │   │   ├── dashboard/    # Dashboard del usuario
│   │   │   ├── marketplace/  # Mercado de tokens
│   │   │   └── portfolio/    # Portfolio del usuario
│   │   ├── page.tsx          # Pagina de inicio/login
│   │   └── layout.tsx        # Layout principal
│   ├── components/           # Componentes reutilizables
│   │   ├── auth/            # Componentes de autenticacion
│   │   └── ui/              # Componentes de interfaz (shadcn/ui)
│   ├── contexts/            # Contextos de React
│   │   ├── auth-context.tsx # Contexto de autenticacion
│   │   ├── wallet-context.tsx # Contexto de wallet
│   │   └── anchor-context.tsx # Contexto de Anchor/Solana
│   ├── hooks/               # Custom hooks
│   │   ├── use-opti-freight.ts # Hook principal para interactuar con contratos
│   │   ├── use-solana-wallet.ts # Hook para wallet de Solana
│   │   └── use-toast.ts     # Hook para notificaciones
│   └── lib/                 # Utilidades y configuracion
│       ├── anchor/          # Configuracion de Anchor
│       └── utils.ts         # Funciones utilitarias
├── public/                  # Archivos estaticos
├── package.json            # Dependencias del proyecto
└── README.md              # Este archivo
```

### Tecnologias Utilizadas

#### Core
- **Next.js 15** - Framework React con App Router
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estatico

#### Blockchain
- **Solana Web3.js** - Interaccion con blockchain de Solana
- **Anchor** - Framework para smart contracts de Solana
- **Wallet Adapter** - Integracion con wallets de Solana

#### UI/UX
- **Tailwind CSS** - Framework de CSS
- **shadcn/ui** - Componentes de UI
- **Radix UI** - Primitivos de UI accesibles
- **Lucide React** - Iconos

#### Formularios y Validacion
- **React Hook Form** - Manejo de formularios
- **Zod** - Validacion de esquemas

### Uso de la Aplicacion

#### 1. Conectar Wallet

1. Abre la aplicacion en tu navegador
2. Haz clic en "Connect Wallet"
3. Selecciona tu wallet (Phantom, Solflare, etc.)
4. Autoriza la conexion

#### 2. Comprar Tokens (Mercado Primario)

1. Ve a "Marketplace"
2. Busca trailers disponibles
3. Selecciona la cantidad de tokens
4. Confirma la transaccion en tu wallet
5. Precio: $200 USDC por token + 3% de comision

#### 3. Vender Tokens (Mercado Secundario)

1. Ve a "Portfolio"
2. Selecciona los tokens que deseas vender
3. Establece el precio (minimo $250 USDC)
4. Crea el listado
5. Nota: Se aplica una penalizacion de $50 por token + 3% de comision

#### 4. Reclamar Retornos

1. Espera al dia 20 del mes
2. Ve a "Portfolio"
3. Haz clic en "Reclamar Retornos"
4. Los retornos se distribuyen proporcionalmente segun tu participacion

### Configuracion de Contratos

El frontend esta configurado para conectarse al programa unificado de Opti-Freight desplegado en Solana Devnet:

- **Program ID**: `AoR4goYR4q6mR1X6gB51CX67EbgzGmSYd6eWPN4A4ddq`
- **USDC Mint**: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
- **Platform Wallet**: `468zRBWHvREsy67no7yVviW69i173dZt25XKsDqKeCNh`

Puedes encontrar la configuracion en `src/hooks/use-opti-freight.ts`

### Desarrollo

#### Agregar nuevas funcionalidades

1. Los componentes de UI van en `src/components/`
2. Los hooks personalizados van en `src/hooks/`
3. Las paginas van en `src/app/`
4. Los contextos van en `src/contexts/`

#### Interactuar con contratos

Usa el hook `useOptiFreight()` para interactuar con los smart contracts:

```typescript
import { useOptiFreight } from '@/hooks/use-opti-freight';

function MiComponente() {
  const { buyPrimary, createListing, distributeMonthly } = useOptiFreight();

  // Comprar tokens del mercado primario
  const handleBuy = async () => {
    const result = await buyPrimary(salePublicKey, 10);
    if (result.success) {
      console.log('Compra exitosa:', result.signature);
    }
  };

  return (
    <button onClick={handleBuy}>Comprar Tokens</button>
  );
}
```

### Problemas Comunes

#### Error: "Wallet not connected"
- Asegurate de tener una wallet de Solana instalada
- Conecta tu wallet antes de realizar transacciones

#### Error: "Insufficient funds"
- Verifica que tengas suficiente SOL para las tarifas de transaccion
- Verifica que tengas suficiente USDC para comprar tokens

#### La aplicacion no carga
- Verifica que todas las dependencias esten instaladas: `npm install`
- Limpia el cache: `rm -rf .next`
- Reinicia el servidor de desarrollo

### Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Licencia

Este proyecto es privado y confidencial.

### Contacto

Para preguntas o soporte, contacta al equipo de desarrollo de Opti-Freight.

---

**Nota**: Esta aplicacion esta actualmente configurada para funcionar en Solana Devnet. Para usar en mainnet, actualiza las configuraciones en los archivos correspondientes.
