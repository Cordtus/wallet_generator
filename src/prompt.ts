import { select } from "@inquirer/prompts"
import { generateAddressesFromPrivateKey, generateAddressesFromPublicKey } from "./utils/crypto.js"
import { getPrivateKeyFromMnemonic } from "./utils/mnemonic.js"
import {
	derivationPathSchema,
	mnemonicSchema,
	prefixSchema,
	privateKeySchema,
	publicKeySchema,
	validatedInput
} from "./utils/schema.js"

export const promptUser = async (): Promise<void> => {
	const mode = await select({
		message: "Select input mode:",
		choices: ["Mnemonic", "Private Key", "Public Key"]
	})

	if (mode === "Mnemonic") {
		const mnemonic = await validatedInput(mnemonicSchema, {
			message: "Enter your mnemonic:"
		})

		const derivationPath = await validatedInput(derivationPathSchema, {
			message: "Enter the derivation path (e.g., m/44'/118'/0'/0/0 for Cosmos):",
			default: "m/44'/118'/0'/0/0"
		})

		const prefix = await validatedInput(prefixSchema, {
			message: "Enter the Bech32 prefix (e.g., sei, osmo):",
			default: "sei"
		})

		const privateKeyHex = Buffer.from(
			getPrivateKeyFromMnemonic(mnemonic, derivationPath)
		).toString("hex")
		const { address, ethAddress, publicKey, privateKey } = generateAddressesFromPrivateKey(
			privateKeyHex,
			prefix
		)
		console.log(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Address: ${address}`)
		console.log(`Ethereum Address: ${ethAddress}`)
		console.log(`Private Key: ${privateKey}`)
		console.log(`Public Key: ${publicKey}`)
	} else if (mode === "Private Key") {
		const privateKey = await validatedInput(privateKeySchema, {
			message: "Enter your private key (hex format):"
		})

		const prefix = await validatedInput(prefixSchema, {
			message: "Enter the Bech32 prefix (e.g., sei, osmo):",
			default: "sei"
		})

		const {
			address,
			ethAddress,
			publicKey,
			privateKey: privKey
		} = generateAddressesFromPrivateKey(privateKey, prefix)
		console.log(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Address: ${address}`)
		console.log(`Ethereum Address: ${ethAddress}`)
		console.log(`Private Key: ${privKey}`)
		console.log(`Public Key: ${publicKey}`)
	} else if (mode === "Public Key") {
		const publicKey = await validatedInput(publicKeySchema, {
			message: "Enter your public key (hex format):"
		})

		const prefix = await validatedInput(prefixSchema, {
			message: "Enter the Bech32 prefix (e.g., sei, osmo):",
			default: "sei"
		})

		const publicKeyBytes = Uint8Array.from(Buffer.from(publicKey, "hex"))
		const { address } = generateAddressesFromPublicKey(publicKeyBytes, prefix)
		console.log(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Address: ${address}`)
	}
}
