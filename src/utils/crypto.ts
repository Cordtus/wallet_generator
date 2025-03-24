import { secp256k1 } from "@noble/curves/secp256k1"
import { ripemd160 } from "@noble/hashes/ripemd160"
import { keccak_256 } from "@noble/hashes/sha3"
import { sha256 } from "@noble/hashes/sha256"
import { bech32 } from "bech32"
import { convertBits } from "./convert.js"

export const generateAddressesFromPublicKey = (
	publicKeyBytes: Uint8Array,
	prefix: string
): { address: string } => {
	const sha256Digest = sha256(publicKeyBytes)
	const ripemd160Digest = ripemd160(sha256Digest)
	const fiveBitArray = convertBits(ripemd160Digest, 8, 5, true)
	const address = bech32.encode(prefix, fiveBitArray, 256)
	return { address }
}

export const generateAddressesFromPrivateKey = (
	privateKeyHex: string,
	prefix: string
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
	const { address } = generateAddressesFromPublicKey(publicKeyCompressed, prefix)

	const publicKeyUncompressed = secp256k1.getPublicKey(privateKey, false).slice(1)
	const keccakHash = keccak_256(publicKeyUncompressed)
	const ethAddress = `0x${Buffer.from(keccakHash).slice(-20).toString("hex")}`

	return {
		address,
		ethAddress,
		publicKey: Buffer.from(publicKeyCompressed).toString("hex"),
		privateKey: Buffer.from(privateKey).toString("hex")
	}
}
