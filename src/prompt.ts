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

/**
 * Convert a base64 public key to hex format
 * @param pubkey The public key in base64 format
 * @returns The public key in hex format
 */
const base64ToHex = (pubkey: string): string => {
	// Convert base64 to hex and ensure no newlines or whitespace
	return Buffer.from(pubkey, "base64").toString("hex").replace(/\s+/g, "")
}

/**
 * Detect if a string is likely a base64 encoded public key
 * @param pubkey The public key string to check
 * @returns Boolean indicating if it's likely base64 encoded
 */
const isLikelyBase64 = (pubkey: string): boolean => {
	return /^[A-Za-z0-9+/=]+$/.test(pubkey) && !/^[0-9a-fA-F]+$/.test(pubkey)
}

export const promptUser = async (): Promise<void> => {
	const mode = await select({
		message: "Select input mode:",
		choices: [
			{ name: "Mnemonic (Seed Phrase)", value: "Mnemonic" },
			{ name: "Private Key (Hex)", value: "Private Key" },
			{ name: "Public Key (Hex or Base64)", value: "Public Key" }
		]
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
		const publicKeyInput = await validatedInput(publicKeySchema, {
			message: "Enter a valid public key (hex or base64):"
		})

		// Determine if this is likely a base64 encoded key and convert if needed
		let publicKeyHex = publicKeyInput

		if (isLikelyBase64(publicKeyInput)) {
			try {
				publicKeyHex = base64ToHex(publicKeyInput)
				console.log(`Detected base64 format, converted to hex: ${publicKeyHex}`)
			} catch (error) {
				console.error(
					"Error: Failed to convert from base64, trying original input. Details:",
					error
				)
			}
		}

		const prefix = await validatedInput(prefixSchema, {
			message: "Enter the Bech32 prefix (e.g., sei, osmo):",
			default: "sei"
		})

		const publicKeyBytes = Uint8Array.from(Buffer.from(publicKeyHex, "hex"))
		const { address } = generateAddressesFromPublicKey(publicKeyBytes, prefix)
		console.log(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Address: ${address}`)
	}
}
