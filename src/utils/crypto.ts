import { secp256k1 } from "@noble/curves/secp256k1"
import { ripemd160 } from "@noble/hashes/ripemd160"
import { keccak_256 } from "@noble/hashes/sha3"
import { sha256 } from "@noble/hashes/sha256"
import { bech32 } from "bech32"
import { convertBits } from "./convert.js"

/**
 * Key type affecting how addresses are derived from a public key.
 */
export enum KeyType {
	/** Standard derivation: both addresses properly hashed. */
	CANONICAL = "canonical",
	/** Skip RIPEMD160 for the Cosmos address, use keccak hash converted to bech32. */
	ETH_SECP256K1 = "eth_secp256k1",
	/** Skip keccak for the hex address, use ripemd160 hash converted to hex. */
	SECP256K1 = "secp256k1"
}

/**
 * Get the raw 64-byte public key (x || y, no 0x04 prefix) from compressed or uncompressed bytes.
 * @param publicKeyBytes The raw public key bytes.
 * @returns The 64-byte public key used for keccak hashing.
 */
const toUncompressedKey = (publicKeyBytes: Uint8Array): Uint8Array => {
	if (publicKeyBytes.length === 64) return publicKeyBytes
	if (publicKeyBytes.length === 65) return publicKeyBytes.slice(1)
	return secp256k1.ProjectivePoint.fromHex(Buffer.from(publicKeyBytes).toString("hex"))
		.toRawBytes(false)
		.slice(1)
}

/**
 * Derive an Ethereum-style hex address from a public key.
 * @param publicKeyBytes The raw public key bytes (compressed or uncompressed).
 * @param keyType The key type governing the hashing scheme.
 * @returns The "0x"-prefixed hex address.
 */
export const getEthAddressFromPublicKey = (
	publicKeyBytes: Uint8Array,
	keyType: KeyType = KeyType.CANONICAL
): string => {
	if (keyType === KeyType.SECP256K1) {
		const sha256Digest = sha256(publicKeyBytes)
		const ripemd160Digest = ripemd160(sha256Digest)
		return `0x${Buffer.from(ripemd160Digest).toString("hex")}`
	}

	const keccakHash = keccak_256(toUncompressedKey(publicKeyBytes))
	return `0x${Buffer.from(keccakHash.slice(-20)).toString("hex")}`
}

/**
 * Generate a bech32 address and Ethereum address from a public key using the given key type.
 * @param publicKeyBytes The raw public key bytes (compressed or uncompressed).
 * @param prefix The bech32 prefix (e.g. "sei", "osmo").
 * @param keyType The key type governing the hashing scheme. Defaults to {@link KeyType.CANONICAL}.
 * @returns The derived bech32 and Ethereum addresses.
 */
export const generateAddressesFromPublicKey = (
	publicKeyBytes: Uint8Array,
	prefix: string,
	keyType: KeyType = KeyType.CANONICAL
): { address: string; ethAddress: string } => {
	let address: string

	if (keyType === KeyType.ETH_SECP256K1) {
		const keccakHash = keccak_256(toUncompressedKey(publicKeyBytes))
		const addressBytes = keccakHash.slice(-20)
		const fiveBitArray = convertBits(addressBytes, 8, 5, true)
		address = bech32.encode(prefix, fiveBitArray, 256)
	} else {
		const sha256Digest = sha256(publicKeyBytes)
		const ripemd160Digest = ripemd160(sha256Digest)
		const fiveBitArray = convertBits(ripemd160Digest, 8, 5, true)
		address = bech32.encode(prefix, fiveBitArray, 256)
	}

	return { address, ethAddress: getEthAddressFromPublicKey(publicKeyBytes, keyType) }
}

/**
 * Generate addresses and public/private keys from a private key using the given key type.
 * @param privateKeyHex The private key as a hex string (64 chars).
 * @param prefix The bech32 prefix (e.g. "sei", "osmo").
 * @param keyType The key type governing the hashing scheme. Defaults to {@link KeyType.CANONICAL}.
 * @returns The derived bech32 address, Ethereum address, and public/private keys.
 * @throws If the private key is not exactly 32 bytes.
 */
export const generateAddressesFromPrivateKey = (
	privateKeyHex: string,
	prefix: string,
	keyType: KeyType = KeyType.CANONICAL
): {
	address: string
	ethAddress: string
	publicKey: string
	privateKey: string
} => {
	const privateKeyBuffer = Buffer.from(privateKeyHex.padStart(64, "0"), "hex")
	const privateKey = Uint8Array.from(privateKeyBuffer)
	if (privateKey.length !== 32) {
		throw new Error("Private key must be 32 bytes long.")
	}
	const publicKeyCompressed = secp256k1.getPublicKey(privateKey, true)

	const address = generateAddressesFromPublicKey(publicKeyCompressed, prefix, keyType).address
	const ethAddress = getEthAddressFromPublicKey(publicKeyCompressed, keyType)

	return {
		address,
		ethAddress,
		publicKey: Buffer.from(publicKeyCompressed).toString("hex"),
		privateKey: Buffer.from(privateKey).toString("hex")
	}
}
