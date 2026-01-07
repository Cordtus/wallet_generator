/**
 * Browser-compatible wallet generation module
 * Supports secp256k1 (standard Cosmos) and eth_secp256k1 (EVM-compatible Cosmos chains)
 */
import { secp256k1 } from "@noble/curves/secp256k1"
import { ripemd160 } from "@noble/hashes/ripemd160"
import { keccak_256 } from "@noble/hashes/sha3"
import { sha256 } from "@noble/hashes/sha256"
import { HDKey } from "@scure/bip32"
import * as bip39 from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english"
import { bech32 } from "bech32"

/**
 * Key types for address derivation
 * - secp256k1: Standard Cosmos address derivation (SHA256 -> RIPEMD160)
 * - eth_secp256k1: EVM-compatible Cosmos chains (Keccak256, same as Ethereum)
 */
export type KeyType = "secp256k1" | "eth_secp256k1"

/**
 * Convert bits between different bases (needed for bech32 encoding)
 */
const convertBits = (
	data: Uint8Array,
	fromBits: number,
	toBits: number,
	pad: boolean
): number[] => {
	let acc = 0
	let bits = 0
	const result: number[] = []
	const maxv = (1 << toBits) - 1
	for (const value of data) {
		acc = (acc << fromBits) | value
		bits += fromBits
		while (bits >= toBits) {
			bits -= toBits
			result.push((acc >> bits) & maxv)
		}
	}
	if (pad) {
		if (bits > 0) {
			result.push((acc << (toBits - bits)) & maxv)
		}
	} else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
		throw new Error("Unable to convert bits")
	}
	return result
}

/**
 * Convert hex string to Uint8Array
 */
export const hexToBytes = (hex: string): Uint8Array => {
	const bytes = new Uint8Array(hex.length / 2)
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
	}
	return bytes
}

/**
 * Convert Uint8Array to hex string
 */
export const bytesToHex = (bytes: Uint8Array): string => {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

/**
 * Detect if a string is likely a base64 encoded public key
 * @param input - The string to check
 * @returns Boolean indicating if it's likely base64 encoded
 */
export const isLikelyBase64 = (input: string): boolean => {
	// Base64 uses A-Za-z0-9+/= characters
	// Hex only uses 0-9a-fA-F
	// If it matches base64 pattern but NOT hex pattern, it's likely base64
	return /^[A-Za-z0-9+/=]+$/.test(input) && !/^[0-9a-fA-F]+$/.test(input)
}

/**
 * Convert a base64 string to hex
 * @param base64 - The base64 encoded string
 * @returns Hex string
 */
export const base64ToHex = (base64: string): string => {
	const binaryString = atob(base64)
	let hex = ""
	for (let i = 0; i < binaryString.length; i++) {
		hex += binaryString.charCodeAt(i).toString(16).padStart(2, "0")
	}
	return hex
}

/**
 * Validate a BIP39 mnemonic phrase
 * @param mnemonic - The mnemonic phrase to validate
 * @returns Error message if invalid, null if valid
 */
export const validateMnemonic = (mnemonic: string): string | null => {
	const words = mnemonic.trim().split(/\s+/)

	if (words.length < 12) {
		return `Mnemonic should contain at least 12 words, but got ${words.length}.`
	}

	const invalidWords = words.filter((word) => !wordlist.includes(word.toLowerCase()))
	if (invalidWords.length > 0) {
		return `Invalid mnemonic words: ${invalidWords.join(", ")}`
	}

	if (!bip39.validateMnemonic(mnemonic.toLowerCase(), wordlist)) {
		return "Invalid mnemonic checksum"
	}

	return null
}

/**
 * Validate a derivation path
 * @param path - The derivation path to validate
 * @returns Error message if invalid, null if valid
 */
export const validateDerivationPath = (path: string): string | null => {
	let cleanPath = path.trim()
	if (cleanPath.startsWith("(") && cleanPath.endsWith(")")) {
		cleanPath = cleanPath.slice(1, -1).trim()
	}

	const parts = cleanPath.split(/\s*\/\s*/)

	if (parts.length !== 6) {
		return "Derivation path must have exactly 6 segments: m / purpose' / coin_type' / account' / change / index."
	}

	if (parts[0] !== "m") {
		return "Derivation path must start with 'm'."
	}

	if (!/^\d+'$/.test(parts[1])) {
		return `Invalid purpose segment: "${parts[1]}". It must be a hardened number (e.g. 44').`
	}

	if (!/^\d+'$/.test(parts[2])) {
		return `Invalid coin type segment: "${parts[2]}". It must be a hardened number (e.g. 118').`
	}

	if (!/^\d+'$/.test(parts[3])) {
		return `Invalid account segment: "${parts[3]}". It must be a hardened number (e.g. 0').`
	}

	if (!/^\d+$/.test(parts[4])) {
		return `Invalid change segment: "${parts[4]}". It must be a non-hardened number.`
	}

	if (!/^\d+$/.test(parts[5])) {
		return `Invalid index segment: "${parts[5]}". It must be a non-hardened number.`
	}

	return null
}

/**
 * Validate a bech32 prefix
 * @param prefix - The prefix to validate
 * @returns Error message if invalid, null if valid
 */
export const validatePrefix = (prefix: string): string | null => {
	if (!/^[a-z]+$/.test(prefix)) {
		return "Prefix must contain only lowercase letters a-z"
	}
	return null
}

/**
 * Validate a private key
 * @param key - The private key to validate
 * @returns Error message if invalid, null if valid
 */
export const validatePrivateKey = (key: string): string | null => {
	if (!/^[0-9a-fA-F]+$/.test(key)) {
		return "Private key must be a hex string"
	}
	if (key.length !== 64) {
		return "Private key must be exactly 64 characters long"
	}
	return null
}

/**
 * Validate a public key (supports hex and base64 formats)
 * @param key - The public key to validate (hex or base64)
 * @returns Object with error message if invalid, or converted hex if valid
 */
export const validatePublicKey = (key: string): { error: string | null; hexKey: string } => {
	const trimmedKey = key.trim()

	// Check if it's base64 format
	if (isLikelyBase64(trimmedKey)) {
		try {
			const hexKey = base64ToHex(trimmedKey)
			// Validate the converted hex length
			if (!(hexKey.length === 66 || hexKey.length === 130)) {
				return {
					error: `Decoded base64 key has invalid length (${hexKey.length}). Expected 66 (compressed) or 130 (uncompressed).`,
					hexKey: ""
				}
			}
			return { error: null, hexKey }
		} catch {
			return { error: "Invalid base64 encoding", hexKey: "" }
		}
	}

	// Validate as hex
	if (!/^[0-9a-fA-F]+$/.test(trimmedKey)) {
		return { error: "Public key must be a hex or base64 string", hexKey: "" }
	}
	if (!(trimmedKey.length === 66 || trimmedKey.length === 130)) {
		return {
			error: "Public key must be either 66 (compressed) or 130 (uncompressed) hex characters",
			hexKey: ""
		}
	}
	return { error: null, hexKey: trimmedKey }
}

/**
 * Derive private key from a mnemonic phrase using BIP32/BIP44
 * @param mnemonic - BIP39 mnemonic phrase
 * @param derivationPath - BIP44 derivation path (e.g., m/44'/118'/0'/0/0)
 * @returns Private key as Uint8Array
 */
export const getPrivateKeyFromMnemonic = (mnemonic: string, derivationPath: string): Uint8Array => {
	let path = derivationPath.trim()
	if (path.startsWith("(") && path.endsWith(")")) {
		path = path.slice(1, -1).trim()
	}

	const seed = bip39.mnemonicToSeedSync(mnemonic.toLowerCase())
	const hdKey = HDKey.fromMasterSeed(seed)
	const derived = hdKey.derive(path)

	if (!derived.privateKey) {
		throw new Error("Unable to derive private key from mnemonic and path.")
	}

	return derived.privateKey
}

/**
 * Generate Cosmos address from public key bytes using standard secp256k1
 * Uses SHA256 -> RIPEMD160 -> Bech32
 * @param publicKeyBytes - Compressed public key
 * @param prefix - Bech32 prefix
 * @returns Bech32-encoded address
 */
const generateCosmosAddressSecp256k1 = (publicKeyBytes: Uint8Array, prefix: string): string => {
	const sha256Digest = sha256(publicKeyBytes)
	const ripemd160Digest = ripemd160(sha256Digest)
	const fiveBitArray = convertBits(ripemd160Digest, 8, 5, true)
	return bech32.encode(prefix, fiveBitArray, 256)
}

/**
 * Generate Cosmos address from public key bytes using eth_secp256k1
 * Uses Keccak256 -> last 20 bytes -> Bech32 (same derivation as Ethereum)
 * @param publicKeyUncompressed - Uncompressed public key (without 0x04 prefix)
 * @param prefix - Bech32 prefix
 * @returns Bech32-encoded address
 */
const generateCosmosAddressEthSecp256k1 = (
	publicKeyUncompressed: Uint8Array,
	prefix: string
): string => {
	const keccakHash = keccak_256(publicKeyUncompressed)
	const addressBytes = keccakHash.slice(-20)
	const fiveBitArray = convertBits(addressBytes, 8, 5, true)
	return bech32.encode(prefix, fiveBitArray, 256)
}

/**
 * Generate Ethereum address from uncompressed public key
 * Uses Keccak256 -> last 20 bytes -> Hex
 * @param publicKeyUncompressed - Uncompressed public key (without 0x04 prefix)
 * @returns Ethereum address with 0x prefix
 */
const generateEthereumAddress = (publicKeyUncompressed: Uint8Array): string => {
	const keccakHash = keccak_256(publicKeyUncompressed)
	return `0x${bytesToHex(keccakHash.slice(-20))}`
}

/**
 * Generate Cosmos address from public key bytes
 * @param publicKeyBytes - Compressed or uncompressed public key
 * @param prefix - Bech32 prefix (e.g., "cosmos", "sei", "osmo")
 * @param keyType - Key type for address derivation
 * @returns Object containing the bech32-encoded address
 */
export const generateAddressesFromPublicKey = (
	publicKeyBytes: Uint8Array,
	prefix: string,
	keyType: KeyType = "secp256k1"
): { address: string } => {
	if (keyType === "eth_secp256k1") {
		// For eth_secp256k1, we need uncompressed public key
		let uncompressedKey: Uint8Array
		if (publicKeyBytes.length === 33) {
			// Compressed key - need to decompress
			const point = secp256k1.ProjectivePoint.fromHex(publicKeyBytes)
			uncompressedKey = point.toRawBytes(false).slice(1) // Remove 0x04 prefix
		} else if (publicKeyBytes.length === 65) {
			// Already uncompressed with 0x04 prefix
			uncompressedKey = publicKeyBytes.slice(1)
		} else {
			// Already uncompressed without prefix
			uncompressedKey = publicKeyBytes
		}
		const address = generateCosmosAddressEthSecp256k1(uncompressedKey, prefix)
		return { address }
	}

	// Standard secp256k1: use compressed key
	let compressedKey: Uint8Array
	if (publicKeyBytes.length === 33) {
		compressedKey = publicKeyBytes
	} else {
		// Need to compress
		const point = secp256k1.ProjectivePoint.fromHex(
			publicKeyBytes.length === 65 ? publicKeyBytes : new Uint8Array([0x04, ...publicKeyBytes])
		)
		compressedKey = point.toRawBytes(true)
	}
	const address = generateCosmosAddressSecp256k1(compressedKey, prefix)
	return { address }
}

/**
 * Generate addresses and public key from a private key
 * @param privateKeyHex - Private key as hex string (64 characters)
 * @param prefix - Bech32 prefix for Cosmos address
 * @param keyType - Key type for address derivation
 * @returns Object containing Cosmos address, Ethereum address, public key, and private key
 */
export const generateAddressesFromPrivateKey = (
	privateKeyHex: string,
	prefix: string,
	keyType: KeyType = "secp256k1"
): {
	address: string
	ethAddress: string
	publicKey: string
	privateKey: string
} => {
	const privateKeyBuffer = hexToBytes(privateKeyHex.padStart(64, "0"))
	if (privateKeyBuffer.length !== 32) {
		throw new Error("Private key must be 32 bytes long.")
	}

	const publicKeyCompressed = secp256k1.getPublicKey(privateKeyBuffer, true)
	const publicKeyUncompressed = secp256k1.getPublicKey(privateKeyBuffer, false).slice(1)

	// Generate Ethereum address (always uses Keccak256)
	const ethAddress = generateEthereumAddress(publicKeyUncompressed)

	// Generate Cosmos address based on key type
	let address: string
	if (keyType === "eth_secp256k1") {
		address = generateCosmosAddressEthSecp256k1(publicKeyUncompressed, prefix)
	} else {
		address = generateCosmosAddressSecp256k1(publicKeyCompressed, prefix)
	}

	return {
		address,
		ethAddress,
		publicKey: bytesToHex(publicKeyCompressed),
		privateKey: bytesToHex(privateKeyBuffer)
	}
}
