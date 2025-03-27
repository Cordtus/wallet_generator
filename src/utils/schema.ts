import { input } from "@inquirer/prompts"
import * as bip39 from "bip39"
import { z } from "zod"

/**
 * Validated input using Zod schema and user input
 */
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

/**
 * Mnemonic validation schema
 */
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

/**
 * Derivation path validation schema
 */
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

	// Validate hardened and non-hardened segments
	const segmentChecks = [
		{ index: 1, name: "purpose", regex: /^\d+'$/ },
		{ index: 2, name: "coin type", regex: /^\d+'$/ },
		{ index: 3, name: "account", regex: /^\d+'$/ },
		{ index: 4, name: "change", regex: /^\d+$/ },
		{ index: 5, name: "index", regex: /^\d+$/ }
	]

	for (const { index, name, regex } of segmentChecks) {
		if (!regex.test(parts[index])) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Invalid ${name} segment: "${parts[index]}".`
			})
		}
	}
})

/**
 * Prefix validation schema (only lowercase letters)
 */
export const prefixSchema = z
	.string()
	.regex(/^[a-z]+$/, "Prefix must contain only lowercase letters a-z")

/**
 * Private key validation schema (hex format, length: 64)
 */
export const privateKeySchema = z
	.string()
	.regex(/^[0-9a-fA-F]+$/, "Private key must be a hex string")
	.superRefine((key, ctx) => {
		if (key.length !== 64) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Error: Private key must be exactly 64 characters long. Got: ${key.length}`
			})
		}
	})

/**
 * Public key validation schema
 * - Hex string, length 66 (compressed) or 130 (uncompressed)
 * - OR valid pubkey bytes as a base64 encoded string
 */
export const publicKeySchema = z.string().superRefine((key, ctx) => {
	// Check if input is a valid hex string
	const isHex = /^[0-9a-fA-F]+$/.test(key) && (key.length === 66 || key.length === 130)
	if (isHex) return // If valid hex, no further checks needed

	// Attempt to validate as base64
	try {
		// Check if the input follows base64 character set
		if (!/^[A-Za-z0-9+/=]+$/.test(key)) {
			throw new Error("Not a valid base64 string")
		}

		// Decode base64 to hex
		const decoded = Buffer.from(key, "base64").toString("hex")

		// Ensure decoded hex is valid length
		if (!(decoded.length === 66 || decoded.length === 130)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Error: Decoded key invalid - expected length 66 or 130, got: ${decoded.length}`
			})
		}
	} catch (error) {
		// Consistent error handling and logging
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error("Public key parsing error:", errorMessage)

		// ✅ Adding error details to the validation issue
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Error: Public key must be a valid hex string or a base64-encoded version of the same. Parsing error: ${errorMessage}`
		})
	}
})
