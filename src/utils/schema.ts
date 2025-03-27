import { input } from "@inquirer/prompts"
import * as bip39 from "bip39"
import { z } from "zod"

export const validatedInput = async <T>(
	schema: z.ZodType<T>,
	promptConfig: Parameters<typeof input>[0]
): Promise<T> => {
	while (true) {
		const value = await input(promptConfig)
		const result = schema.safeParse(value)

		if (result.success) {
			return result.data
		}

		console.error(`Error: ${result.error.errors.map((e) => e.message).join(", ")}`)
	}
}

export const mnemonicSchema = z
	.string()
	.min(1, "Mnemonic cannot be empty")
	.superRefine((m, ctx) => {
		const words = m.trim().split(/\s+/)

		if (words.length < 12) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Mnemonic should contain at least 12 words, but got ${words.length}.`
			})
			return
		}

		const invalidWords = words.filter(
			// biome-ignore lint/complexity/useLiteralKeys: no typed keys for wordlist
			(word) => !bip39.wordlists["english"].includes(word.toLowerCase())
		)

		if (invalidWords.length > 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Invalid mnemonic words: ${invalidWords.join(", ")}`
			})
		}
	})

export const derivationPathSchema = z.string().superRefine((m, ctx) => {
	// Trim the input and remove surrounding parentheses if present.
	let path = m.trim()
	if (path.startsWith("(") && path.endsWith(")")) {
		path = path.slice(1, -1).trim()
	}

	// Split by "/" while trimming whitespace around segments.
	const parts = path.split(/\s*\/\s*/)

	if (parts.length !== 6) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message:
				"Derivation path must have exactly 6 segments: m / purpose' / coin_type' / account' / change / index."
		})
		return
	}

	if (parts[0] !== "m") {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Derivation path must start with 'm'."
		})
	}

	// Validate hardened segments: purpose, coin_type, account.
	if (!/^\d+'$/.test(parts[1])) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Invalid purpose segment: "${parts[1]}". It must be a hardened number (e.g. 44').`
		})
	}

	if (!/^\d+'$/.test(parts[2])) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Invalid coin type segment: "${parts[2]}". It must be a hardened number (e.g. 118').`
		})
	}

	if (!/^\d+'$/.test(parts[3])) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Invalid account segment: "${parts[3]}". It must be a hardened number (e.g. 0').`
		})
	}

	// Validate non-hardened segments: change and index.
	if (!/^\d+$/.test(parts[4])) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Invalid change segment: "${parts[4]}". It must be a non-hardened number.`
		})
	}

	if (!/^\d+$/.test(parts[5])) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Invalid index segment: "${parts[5]}". It must be a non-hardened number.`
		})
	}
})

// Prefix schema: only allow lowercase letters a-z (no numbers)
export const prefixSchema = z
	.string()
	.regex(/^[a-z]+$/, "Error: Prefix must contain only lowercase letters a-z")

// Private key: 32 byte hex string (64 characters)
export const privateKeySchema = z
	.string()
	.regex(/^[0-9a-fA-F]+$/, "Private key must be a hex string")
	.superRefine((key, ctx) => {
		if (key.length !== 64) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Error: Privkey (hex) Invalid - expected length: 64, got: ${key.length}`
			})
		}
	})

// Public key: hex string, length: 66 (compressed) or 130 (uncompressed)
// OR valid pubkey bytes as a base64 encoded string
export const publicKeySchema = z.string().superRefine((key, ctx) => {
	// Check if it's a hex string
	if (/^[0-9a-fA-F]+$/.test(key)) {
		if (!(key.length === 66 || key.length === 130)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					`Error: Pubkey (hex) invalid  - expected length: 66 or 130, got : ${key.length}`
			})
		}
		return key
	}
	
	// Validate base64 string
	try {

		if (!/^[A-Za-z0-9+/=]+$/.test(key)) {
			throw new Error("Error: Not a valid base64 string")
		}
		
		// Attempt to decode the base64 string
		const decoded = Buffer.from(key, "base64").toString("hex")
		
		// The decoded hex should be the right length for a public key
		if (!(decoded.length === 66 || decoded.length === 130)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Error: Decoded key invalid - expected length - 66 or 130, got: ${decoded.length}`
			})
		}
		
		return decoded
	} catch (error) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Error: Public key must be valid hex string, or base64 encoded version of the same"
		})
	}
})
