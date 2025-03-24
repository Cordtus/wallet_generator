import { describe, expect, it } from "bun:test"
import {
	generateAddressesFromPrivateKey,
	generateAddressesFromPublicKey
} from "../src/utils/crypto"
import { publicKeySchema, privateKeySchema, prefixSchema } from "../src/utils/schema"

describe("generateAddressesFromPublicKey", () => {
	it("should generate a valid Bech32 address", () => {
		const publicKeyHex = "03a34b5d5e7a74f5a7d0c7b3a8179c89b5e6e5a857ec5f1b4b7e8c1f8f7f3a4b5c"
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
})
