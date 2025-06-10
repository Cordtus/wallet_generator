import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { keccak_256 } from '@noble/hashes/sha3';
import { secp256k1 } from '@noble/curves/secp256k1';
import { bech32 } from 'bech32';
import { mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import inquirer from 'inquirer';

// Initialize BIP32 with ECC
const bip32 = BIP32Factory(ecc);

// Key type enum
export enum KeyType {
    CANONICAL = 'canonical',
    ETH_SECP256K1 = 'eth_secp256k1',
    SECP256K1 = 'secp256k1'
}

// Convert bits for Bech32 encoding
export function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad: boolean): number[] {
    let acc = 0;
    let bits = 0;
    const result: number[] = [];
    const maxv = (1 << toBits) - 1;
    for (const value of data) {
        acc = (acc << fromBits) | value;
        bits += fromBits;
        while (bits >= toBits) {
            bits -= toBits;
            result.push((acc >> bits) & maxv);
        }
    }
    if (pad) {
        if (bits > 0) {
            result.push((acc << (toBits - bits)) & maxv);
        }
    } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
        throw new Error('Unable to convert bits');
    }
    return result;
}

// Generate addresses from a public key
export function generateAddressesFromPublicKey(publicKeyBytes: Uint8Array, prefix: string, keyType: KeyType = KeyType.CANONICAL): { address: string } {
    let address: string;
    
    if (keyType === KeyType.ETH_SECP256K1) {
        // For ETH_SECP256K1, we need uncompressed public key for keccak
        const isCompressed = publicKeyBytes.length === 33;
        let publicKeyForKeccak: Uint8Array;
        
        if (isCompressed) {
            // Decompress the public key
            const fullPubKey = secp256k1.ProjectivePoint.fromHex(Buffer.from(publicKeyBytes).toString('hex')).toRawBytes(false);
            publicKeyForKeccak = fullPubKey.slice(1); // Remove 0x04 prefix
        } else {
            publicKeyForKeccak = publicKeyBytes.slice(1); // Remove 0x04 prefix if uncompressed
        }
        
        const keccakHash = keccak_256(publicKeyForKeccak);
        const addressBytes = keccakHash.slice(-20);
        const fiveBitArray = convertBits(addressBytes, 8, 5, true);
        address = bech32.encode(prefix, fiveBitArray, 256);
    } else {
        // For CANONICAL and SECP256K1, use SHA256 → RIPEMD160 → Bech32
        const sha256Digest = sha256(publicKeyBytes);
        const ripemd160Digest = ripemd160(sha256Digest);
        const fiveBitArray = convertBits(ripemd160Digest, 8, 5, true);
        address = bech32.encode(prefix, fiveBitArray, 256);
    }

    return { address };
}

// Generate addresses and return public/private keys
export function generateAddressesFromPrivateKey(privateKeyHex: string, prefix: string, keyType: KeyType = KeyType.CANONICAL): { address: string, ethAddress: string, publicKey: string, privateKey: string } {
    const privateKey = Uint8Array.from(Buffer.from(privateKeyHex.padStart(64, '0'), 'hex'));
    if (privateKey.length !== 32) {
        throw new Error('Private key must be 32 bytes long.');
    }

    const publicKey = secp256k1.getPublicKey(privateKey, true); // compressed public key
    const publicKeyUncompressed = secp256k1.getPublicKey(privateKey, false).slice(1);
    
    let address: string;
    let ethAddress: string;

    if (keyType === KeyType.CANONICAL) {
        // Current implementation - both addresses properly hashed
        const { address: cosmosAddr } = generateAddressesFromPublicKey(publicKey, prefix, keyType);
        address = cosmosAddr;
        
        const keccakHash = keccak_256(publicKeyUncompressed);
        ethAddress = `0x${Buffer.from(keccakHash).slice(-20).toString('hex')}`;
    } else if (keyType === KeyType.ETH_SECP256K1) {
        // Skip RIPEMD160 for cosmos address, use keccak hash converted to bech32
        const keccakHash = keccak_256(publicKeyUncompressed);
        const addressBytes = keccakHash.slice(-20);
        const fiveBitArray = convertBits(addressBytes, 8, 5, true);
        address = bech32.encode(prefix, fiveBitArray, 256);
        
        ethAddress = `0x${Buffer.from(addressBytes).toString('hex')}`;
    } else if (keyType === KeyType.SECP256K1) {
        // Skip keccak for hex address, use ripemd160 hash converted to hex
        const { address: cosmosAddr } = generateAddressesFromPublicKey(publicKey, prefix, keyType);
        address = cosmosAddr;
        
        const sha256Digest = sha256(publicKey);
        const ripemd160Digest = ripemd160(sha256Digest);
        ethAddress = `0x${Buffer.from(ripemd160Digest).toString('hex')}`;
    } else {
        throw new Error(`Unsupported key type: ${keyType}`);
    }

    return {
        address,
        ethAddress,
        publicKey: Buffer.from(publicKey).toString('hex'),
        privateKey: Buffer.from(privateKey).toString('hex')
    };
}

// Generate private key from mnemonic using BIP44 derivation path
export function getPrivateKeyFromMnemonic(mnemonic: string, derivationPath: string): Uint8Array {
    // Validate mnemonic before proceeding
    if (!validateMnemonic(mnemonic)) {
        throw new Error(`Invalid mnemonic: ${mnemonic}`);
    }

    const seed = mnemonicToSeedSync(mnemonic);
    const hdwallet = bip32.fromSeed(seed);
    const derivedNode = hdwallet.derivePath(derivationPath);
    const privateKey = derivedNode.privateKey;

    if (!privateKey) {
        throw new Error('Unable to derive private key from mnemonic and path.');
    } 

    return privateKey;
}

// Interactive prompts
async function promptUser(): Promise<void> {
    const { mode }: { mode: string } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'Select input mode:',
            choices: ['Mnemonic', 'Private Key', 'Public Key'],
        },
    ]);

    if (mode === 'Mnemonic') {
        const { mnemonic, derivationPath, prefix, keyType } = await inquirer.prompt([
            {
                type: 'input',
                name: 'mnemonic',
                message: 'Enter your mnemonic:',
            },
            {
                type: 'input',
                name: 'derivationPath',
                message: 'Enter the derivation path (e.g., m/44\'/118\'/0\'/0/0 for Cosmos):',
                default: "m/44'/118'/0'/0/0",
            },
            {
                type: 'input',
                name: 'prefix',
                message: 'Enter the Bech32 prefix (e.g., sei, osmo):',
                default: 'sei',
            },
            {
                type: 'list',
                name: 'keyType',
                message: 'Select key type:',
                choices: [
                    { name: 'Canonical (both addresses properly hashed)', value: KeyType.CANONICAL },
                    { name: 'ETH secp256k1 (skip RIPEMD160 for cosmos)', value: KeyType.ETH_SECP256K1 },
                    { name: 'secp256k1 (skip keccak for hex)', value: KeyType.SECP256K1 }
                ],
                default: KeyType.CANONICAL,
            },
        ]);

        const privateKey = Buffer.from(getPrivateKeyFromMnemonic(mnemonic, derivationPath)).toString('hex');
        const { address, ethAddress, publicKey, privateKey: privKey } = generateAddressesFromPrivateKey(privateKey, prefix, keyType);

        console.log(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Address: ${address}`);
        console.log(`Ethereum Address: ${ethAddress}`);
        console.log(`Private Key: ${privKey}`);
        console.log(`Public Key: ${publicKey}`);
    } else if (mode === 'Private Key') {
        const { privateKey, prefix, keyType } = await inquirer.prompt([
            {
                type: 'input',
                name: 'privateKey',
                message: 'Enter your private key (hex format):',
            },
            {
                type: 'input',
                name: 'prefix',
                message: 'Enter the Bech32 prefix (e.g., sei, osmo):',
                default: 'sei',
            },
            {
                type: 'list',
                name: 'keyType',
                message: 'Select key type:',
                choices: [
                    { name: 'Canonical (both addresses properly hashed)', value: KeyType.CANONICAL },
                    { name: 'ETH secp256k1 (skip RIPEMD160 for cosmos)', value: KeyType.ETH_SECP256K1 },
                    { name: 'secp256k1 (skip keccak for hex)', value: KeyType.SECP256K1 }
                ],
                default: KeyType.CANONICAL,
            },
        ]);

        const { address, ethAddress, publicKey, privateKey: privKey } = generateAddressesFromPrivateKey(privateKey, prefix, keyType);

        console.log(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Address: ${address}`);
        console.log(`Ethereum Address: ${ethAddress}`);
        console.log(`Private Key: ${privKey}`);
        console.log(`Public Key: ${publicKey}`);
    } else if (mode === 'Public Key') {
        const { publicKey, prefix, keyType } = await inquirer.prompt([
            {
                type: 'input',
                name: 'publicKey',
                message: 'Enter your public key (hex format):',
            },
            {
                type: 'input',
                name: 'prefix',
                message: 'Enter the Bech32 prefix (e.g., sei, osmo):',
                default: 'sei',
            },
            {
                type: 'list',
                name: 'keyType',
                message: 'Select key type:',
                choices: [
                    { name: 'Canonical (SHA256 → RIPEMD160 → Bech32)', value: KeyType.CANONICAL },
                    { name: 'ETH secp256k1 (Keccak256 → Bech32)', value: KeyType.ETH_SECP256K1 },
                    { name: 'secp256k1 (SHA256 → RIPEMD160 → Bech32)', value: KeyType.SECP256K1 }
                ],
                default: KeyType.CANONICAL,
            },
        ]);

        const publicKeyBytes = Uint8Array.from(Buffer.from(publicKey, 'hex'));
        const { address } = generateAddressesFromPublicKey(publicKeyBytes, prefix, keyType);

        console.log(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Address: ${address}`);
    }
}

// Start interactive mode
promptUser().catch(console.error);
