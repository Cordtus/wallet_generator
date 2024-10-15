# Wallet Generator

Generates keys and/or wallet addresses from a **mnemonic seed**, **private key**, or **public key**. Supports arbitrary HD paths as per BIP32/BIP44 standards and outputs Bech32 addresses for Cosmos SDK as well as proper (non-evmos) Ethereum address.

Wallet applications love to gatekeep this. 
You know who you are. 
Stop it. Be better. 

## Features

- Generate **private keys**, **public keys**, and **wallet addresses** from a **mnemonic seed**.
- Generate **public keys** and **wallet addresses** from a **private key**.
- Generate **wallet addresses** from a **public key**.
- Accept **arbitrary HD derivation paths**.
- Generate addresses for **Cosmos SDK chains** (Bech32) and **Ethereum** (Hex format).

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

## Usage

When you run the tool, you'll be prompted to select an input mode:

1. **Mnemonic**: Generate private key, public key, and wallet addresses from a mnemonic seed.
2. **Private Key**: Generate public key and wallet addresses from a private key.
3. **Public Key**: Generate wallet addresses from a public key.

### Example Usage

#### Generating from a Mnemonic:

```bash
yarn start

✔ Select input mode: Mnemonic
✔ Enter your mnemonic: [your mnemonic here]
✔ Enter the derivation path: m/44'/118'/0'/0/0
```

The tool will output:

- **Bech32 Address**
- **Ethereum (hex) Address**
- **Public Key**
- **Private Key**

#### Generating from a Private Key:


```bash
yarn start

✔ Select input mode: Private Key
✔ Enter your private key: [your private key here]
```

The tool will output:

- **Bech32 Address**
- **Ethereum (hex) Address**
- **Public Key**

#### Generating from a Public Key:


```bash
yarn start

✔ Select input mode: Public Key
✔ Enter your public key: [your public key here]
```

The tool will output:

- **Bech32 Address**
- **Ethereum Address**

## License

MIT License © 2024 Cordt Hanson
