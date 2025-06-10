# Wallet Generator

Generates keys and/or wallet addresses from a **mnemonic seed**, **private key**, or **public key**. Supports arbitrary HD paths as per BIP32/BIP44 standards and outputs Bech32 addresses for Cosmos SDK as well as proper (non-evmos) Ethereum address.

**NEW**: Now supports **custom key types** for different address derivation methods, allowing you to generate non-deterministic address pairs using different hashing approaches.

Wallet applications love to gatekeep this. 
You know who you are. 
Stop it. Be better. 

## Features

- Generate **private keys**, **public keys**, and **wallet addresses** from a **mnemonic seed**.
- Generate **public keys** and **wallet addresses** from a **private key**.
- Generate **wallet addresses** from a **public key**.
- Accept **arbitrary HD derivation paths**.
- Generate addresses for **Cosmos SDK chains** (Bech32) and **Ethereum** (Hex format).
- **Custom key types** for different address derivation methods:
  - **Canonical**: Standard address generation (both addresses properly hashed)
  - **ETH secp256k1**: Skip RIPEMD160 for cosmos address, use keccak hash converted to bech32
  - **secp256k1**: Skip keccak for hex address, use ripemd160 hash converted to hex

## Installation

1. Clone the repository:

```bash
git clone https://github.com/cordtus/wallet_generator.git
cd wallet_generator
```

2. Install dependencies:

```bash
yarn install
```

3. Build the project:

```bash
yarn build
```

4. Test:

```bash
yarn test
```

5. Run:

```bash
yarn start
```

## Key Types Explained

The tool now supports three different key types that affect how addresses are derived:

### **Canonical** (Default)
- **Cosmos Address**: `PublicKey → SHA256 → RIPEMD160 → Bech32`
- **Ethereum Address**: `PublicKey → Keccak256 → last 20 bytes → Hex`
- This is the standard method used by most wallets and produces the "correct" addresses for each chain type.

### **ETH secp256k1**
- **Cosmos Address**: `PublicKey → Keccak256 → last 20 bytes → Bech32` (skips RIPEMD160)
- **Ethereum Address**: `PublicKey → Keccak256 → last 20 bytes → Hex` (same as canonical)
- The cosmos address uses the same hash as Ethereum but encodes it as bech32.

### **secp256k1**
- **Cosmos Address**: `PublicKey → SHA256 → RIPEMD160 → Bech32` (same as canonical)
- **Ethereum Address**: `PublicKey → SHA256 → RIPEMD160 → Hex` (skips Keccak256)
- The hex address uses the same hash as cosmos but encodes it as hex.

**Important**: These different key types produce **non-deterministic address pairs** - you cannot derive one address from the other without knowing the original public key and the key type used.

## Usage

When you run the tool, you'll be prompted to select an input mode:

1. **Mnemonic**: Generate private key, public key, and wallet addresses from a mnemonic seed.
2. **Private Key**: Generate public key and wallet addresses from a private key.
3. **Public Key**: Generate wallet addresses from a public key.

For each mode, you'll also be prompted to select a **key type** that determines how the addresses are derived.

### Example Usage

#### Generating from a Mnemonic:

```bash
yarn start

✔ Select input mode: Mnemonic
✔ Enter your mnemonic: [your mnemonic here]
✔ Enter the derivation path: m/44'/118'/0'/0/0
✔ Enter the Bech32 prefix: sei
✔ Select key type: Canonical (both addresses properly hashed)
```

The tool will output:

- **Sei Address**: sei1xxx...
- **Ethereum Address**: 0xxxx...
- **Private Key**: xxx...
- **Public Key**: xxx...

#### Generating from a Private Key:

```bash
yarn start

✔ Select input mode: Private Key
✔ Enter your private key: [your private key here]
✔ Enter the Bech32 prefix: cosmos
✔ Select key type: ETH secp256k1 (skip RIPEMD160 for cosmos)
```

The tool will output:

- **Cosmos Address**: cosmos1xxx...
- **Ethereum Address**: 0xxxx...
- **Private Key**: xxx...
- **Public Key**: xxx...

#### Generating from a Public Key:

```bash
yarn start

✔ Select input mode: Public Key
✔ Enter your public key: [your public key here]
✔ Enter the Bech32 prefix: osmo
✔ Select key type: secp256k1 (skip keccak for hex)
```

The tool will output:

- **Osmo Address**: osmo1xxx...

## Use Cases

The different key types enable several interesting use cases:

1. **Address Privacy**: Generate multiple addresses from the same key that appear unrelated
2. **Cross-Chain Compatibility**: Use ETH secp256k1 to have the same address format across EVM and Cosmos chains
3. **Legacy Support**: Use secp256k1 for compatibility with older systems that expect RIPEMD160 hashes
4. **Research & Development**: Test different cryptographic approaches for address generation

## API Usage

You can also use the functions programmatically:

```typescript
import { generateAddressesFromPrivateKey, KeyType } from './src/genWallet';

// Generate with different key types
const canonical = generateAddressesFromPrivateKey(privateKey, 'cosmos', KeyType.CANONICAL);
const ethSecp = generateAddressesFromPrivateKey(privateKey, 'cosmos', KeyType.ETH_SECP256K1);
const secp = generateAddressesFromPrivateKey(privateKey, 'cosmos', KeyType.SECP256K1);

// Each will produce different address combinations
console.log(canonical.address);   // Standard cosmos address
console.log(ethSecp.address);     // Cosmos address using ETH-style hashing
console.log(secp.ethAddress);     // ETH address using cosmos-style hashing
```

## License

MIT License © 2024 Cordt Hanson
