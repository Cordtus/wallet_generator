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
	.regex(/^[a-z]+$/, "Prefix must contain only lowercase letters a-z")

// Private key: hex string of exactly 64 characters
export const privateKeySchema = z
	.string()
	.regex(/^[0-9a-fA-F]+$/, "Private key must be a hex string")
	.superRefine((key, ctx) => {
		if (key.length !== 64) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Private key must be exactly 64 characters long"
			})
		}
	})

// Public key: hex string of 66 (compressed) or 130 (uncompressed) characters
export const publicKeySchema = z
	.string()
	.regex(/^[0-9a-fA-F]+$/, "Public key must be a hex string")
	.superRefine((key, ctx) => {
		if (!(key.length === 66 || key.length === 130)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Public key must be either 66 (compressed) or 130 (uncompressed) hex characters long"
			})
		}
	})
