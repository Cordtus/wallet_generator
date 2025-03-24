import { describe, expect, it } from "bun:test"
import { getPrivateKeyFromMnemonic } from "../src/utils/mnemonic"
import { derivationPathSchema, mnemonicSchema } from "../src/utils/schema"

describe("getPrivateKeyFromMnemonic", () => {
	it("should derive a private key from a valid mnemonic", () => {
		// Using the standard BIP39 test mnemonic
		const mnemonic = "test test test test test test test test test test test ball"
		const derivationPath = "m/44'/0'/0'/0/0"

		// Validate inputs using schemas
		expect(() => mnemonicSchema.parse(mnemonic)).not.toThrow()
		expect(() => derivationPathSchema.parse(derivationPath)).not.toThrow()

		const privateKey = getPrivateKeyFromMnemonic(mnemonic, derivationPath)
		expect(privateKey).toBeInstanceOf(Uint8Array)
		expect(privateKey.length).toEqual(32)
	})

	it("should throw an error for an invalid mnemonic", () => {
		const invalidMnemonic = "invalid mnemonic words"
		const derivationPath = "m/44'/0'/0'/0/0"

		// Check that schema validation catches the invalid mnemonic
		expect(() => mnemonicSchema.parse(invalidMnemonic)).toThrow()
		expect(() => getPrivateKeyFromMnemonic(invalidMnemonic, derivationPath)).toThrow()
	})

	it("should throw an error for an invalid derivation path", () => {
		const invalidDerivationPath = "invalid/path"

		// Check that schema validation catches the invalid derivation path
		expect(() => derivationPathSchema.parse(invalidDerivationPath)).toThrow()
	})
})
