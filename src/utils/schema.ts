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

export const derivationPathSchema = z
	.string()
	.regex(/^m(\/\d+'?)+$/, "Invalid derivation path format")

export const prefixSchema = z.string().min(1, "Prefix cannot be empty")

export const privateKeySchema = z
	.string()
	.regex(/^[0-9a-fA-F]+$/, "Private key must be a hex string")
	.refine((key) => key.length === 64, "Private key must be 64 characters long")

export const publicKeySchema = z.string().regex(/^[0-9a-fA-F]+$/, "Public key must be a hex string")
