# Wallet Generator

Generate private keys, public keys, and wallet addresses from a **mnemonic seed**, **private key**, or **public key**. Supports arbitrary BIP32/BIP44 HD paths and outputs Bech32 (Cosmos SDK) and hex (Ethereum) addresses.

Wallet applications love to gatekeep this. You know who you are. Stop it. Be better.

## Features

- Private key, public key, and address derivation from a **mnemonic seed**.
- Public key and address derivation from a **private key**.
- Address derivation from a **public key** (hex or base64).
- Arbitrary **HD derivation paths**.
- **Bech32** (Cosmos SDK) and **Ethereum** (hex) addresses.
- Selectable key type (Canonical, ETH secp256k1, secp256k1).

## Prerequisites

- [Bun](https://bun.sh)

## Quickstart (CLI)

Clone, install, and build:

```bash
git clone https://github.com/cordtus/wallet_generator.git
cd wallet_generator
bun install
bun run build
```

The `keygen` script is the non-interactive CLI. Secrets are read from environment variables or stdin (never argv, so they don't land in shell history).

### Private key from a mnemonic

```bash
MNEMONIC="your twelve twenty four word seed phrase here" \
bun run keygen --mode mnemonic --style cosmos --prefix sei
```

### Wallet addresses from a public key

```bash
PUBLIC_KEY=033303c7d61c8e8582de6ed52e6227408eb957abc98ef5759514cdac1bb5cd0a42 \
bun run keygen --mode public-key --prefix sei
```

### Wallet addresses from a private key

```bash
PRIVATE_KEY=8d5a5d5a... \
bun run keygen --mode private-key --style evm --prefix cosmos
```

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--mode <mnemonic\|private-key\|public-key>` | Derivation mode (required) | — |
| `--style <cosmos\|evm>` | Key type / address derivation | `cosmos` |
| `--prefix <prefix>` | Bech32 prefix | `sei` |
| `--path <path>` | HD derivation path (mnemonic only) | style default |
| `--help` | Show help | — |

The `evm` style defaults to the `m/44'/60'/0'/0/0` path with the ETH key type; `cosmos` defaults to `m/44'/118'/0'/0/0` with the Canonical key type.

## Interactive mode

Prefer a guided prompt? Run `bun run start` and select a mode (Mnemonic, Private Key, or Public Key), enter the derivation path, Bech32 prefix, and key type.

### Key types

- **Canonical** (default): `PublicKey → SHA256 → RIPEMD160 → Bech32` for Cosmos; `PublicKey → Keccak256 → last 20 bytes → Hex` for Ethereum.
- **ETH secp256k1**: Skips RIPEMD160 for the Cosmos address (uses Keccak256 → Bech32). Ethereum unchanged.
- **secp256k1**: Skips Keccak256 for the hex address (uses RIPEMD160 → Hex). Cosmos unchanged.

### Public key formats

Hex (compressed) and base64 of the same key are both accepted:

```
033303c7d61c8e8582de6ed52e6227408eb957abc98ef5759514cdac1bb5cd0a42
AzMDx9YcjoWC3m7VLmInQI65V6vJjvV1lRTNrBu1zQpC
```

## Development

```bash
bun test        # run tests
bun run lint    # lint and fix
```

## Contributors

- **Cordt Hanson** - Creator / maintainer
- **Marius Modlich** - Major contributor

## License

MIT License © 2024 Cordt Hanson
