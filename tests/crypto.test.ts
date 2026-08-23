import { describe, expect, it } from "bun:test"
import {
	KeyType,
	generateAddressesFromPrivateKey,
	generateAddressesFromPublicKey
} from "../src/utils/crypto"
import { prefixSchema, privateKeySchema, publicKeySchema } from "../src/utils/schema"

describe("generateAddressesFromPublicKey", () => {
	it("should generate a valid Bech32 address", () => {
		const publicKeyHex = "03e8f1035f52ed21615e339be6ac92b318f92c20fa15cb5054a3dd0884e10ecb6d"
		const prefix = "sei"

		expect(() => publicKeySchema.parse(publicKeyHex)).not.toThrow()
		expect(() => prefixSchema.parse(prefix)).not.toThrow()

		const publicKeyBytes = Uint8Array.from(Buffer.from(publicKeyHex, "hex"))
		const { address } = generateAddressesFromPublicKey(publicKeyBytes, prefix)
		expect(address).toMatch(/^sei1/)
	})
})

describe("generateAddressesFromPrivateKey", () => {
	it("should generate address, ethAddress, publicKey, and privateKey", () => {
		const dummyPrivateKey = "1111111111111111111111111111111111111111111111111111111111111111"
		const prefix = "sei"

		expect(() => privateKeySchema.parse(dummyPrivateKey)).not.toThrow()
		expect(() => prefixSchema.parse(prefix)).not.toThrow()

		const result = generateAddressesFromPrivateKey(dummyPrivateKey, prefix)
		expect(result.address).toMatch(/^sei1/)
		expect(result.ethAddress).toMatch(/^0x/)
		expect(result.publicKey.length).toBeGreaterThan(0)
		expect(result.privateKey).toEqual(dummyPrivateKey)
	})

	it("should throw an error for an invalid private key", () => {
		const invalidPrivateKey = "tooshort"
		expect(() => privateKeySchema.parse(invalidPrivateKey)).toThrow()
	})

	it("should match known legacy values for CANONICAL", () => {
		const privateKeyHex = "30e60e7d56ffaa11dab5eac70acbb2601df6b685353264e03a551c02433320d1"
		const prefix = "cosmos"
		const result = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.CANONICAL)
		expect(result.address).toBe("cosmos1085uayqujzd9fj9j7emw5zsua3vgzx708932tt")
		expect(result.ethAddress).toBe("0xd0800523100506f2836f9401110755cb3d758205")
	})

	it("should differ from canonical for ETH_SECP256K1 cosmos address", () => {
		const privateKeyHex = "30e60e7d56ffaa11dab5eac70acbb2601df6b685353264e03a551c02433320d1"
		const prefix = "cosmos"
		const canonical = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.CANONICAL)
		const eth = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.ETH_SECP256K1)
		expect(eth.address).not.toBe(canonical.address)
		expect(eth.ethAddress).toBe(canonical.ethAddress)
	})

	it("should differ from canonical for SECP256K1 eth address", () => {
		const privateKeyHex = "30e60e7d56ffaa11dab5eac70acbb2601df6b685353264e03a551c02433320d1"
		const prefix = "cosmos"
		const canonical = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.CANONICAL)
		const secp = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.SECP256K1)
		expect(secp.address).toBe(canonical.address)
		expect(secp.ethAddress).not.toBe(canonical.ethAddress)
	})

	it("should default to CANONICAL when no key type provided", () => {
		const privateKeyHex = "30e60e7d56ffaa11dab5eac70acbb2601df6b685353264e03a551c02433320d1"
		const prefix = "cosmos"
		const canonical = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.CANONICAL)
		const result = generateAddressesFromPrivateKey(privateKeyHex, prefix)
		expect(result.address).toBe(canonical.address)
		expect(result.ethAddress).toBe(canonical.ethAddress)
	})
})
