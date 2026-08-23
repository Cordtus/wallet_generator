import {
	KeyType,
	generateAddressesFromPrivateKey,
	generateAddressesFromPublicKey
} from "./utils/crypto.js"
import { getPrivateKeyFromMnemonic } from "./utils/mnemonic.js"

type Mode = "mnemonic" | "private-key" | "public-key"

const USAGE = `Usage: bun run keygen --mode <mode> [options]

Modes:
  mnemonic      Derive keys + addresses from a mnemonic (reads $MNEMONIC or stdin)
  private-key   Derive pubkey + addresses from a private key hex (reads $PRIVATE_KEY or stdin)
  public-key    Derive addresses from a public key hex/base64 (reads $PUBLIC_KEY or stdin)

Options:
  --mode <mode>        Which derivation path to run (required)
  --style <style>      evm | cosmos (default: cosmos)
  --prefix <prefix>    Bech32 prefix (default: sei)
  --path <path>        HD derivation path for mnemonic mode (default: cosmos=cosmos path, evm=eth path)
  --help               Show this help

Secrets are read from the matching env var or stdin (never argv), so they do not
appear in shell history.
`

const STYLE_TO_KEY_TYPE: Record<string, KeyType> = {
	evm: KeyType.ETH_SECP256K1,
	cosmos: KeyType.CANONICAL
}

const DEFAULT_PATH: Record<string, string> = {
	evm: "m/44'/60'/0'/0/0",
	cosmos: "m/44'/118'/0'/0/0"
}

const readStdin = async (): Promise<string> => {
	const chunks: Buffer[] = []
	for await (const chunk of Bun.stdin.stream()) {
		chunks.push(Buffer.from(chunk))
	}
	return Buffer.concat(chunks).toString("utf8").trim()
}

const parseArgs = (argv: string[]): Record<string, string> => {
	const result: Record<string, string> = {}
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (arg === "--help" || arg === "-h") {
			result.help = "true"
			continue
		}
		if (arg.startsWith("--")) {
			const key = arg.slice(2)
			const value = argv[i + 1]
			if (value === undefined || value.startsWith("--")) {
				result[key] = "true"
			} else {
				result[key] = value
				i++
			}
		}
	}
	return result
}

const getSecret = async (envVar: string): Promise<string> => {
	const fromEnv = process.env[envVar]?.trim()
	if (fromEnv) return fromEnv
	const stdin = await readStdin()
	return stdin
}

const base64ToHex = (pubkey: string): string =>
	Buffer.from(pubkey, "base64").toString("hex").replace(/\s+/g, "")

const isLikelyBase64 = (pubkey: string): boolean =>
	/^[A-Za-z0-9+/=]+$/.test(pubkey) && !/^[0-9a-fA-F]+$/.test(pubkey)

const printResult = (
	result: {
		address: string
		ethAddress: string
		publicKey: string
		privateKey: string
	},
	prefix: string
): void => {
	console.log(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Address: ${result.address}`)
	console.log(`Ethereum Address: ${result.ethAddress}`)
	console.log(`Private Key: ${result.privateKey}`)
	console.log(`Public Key: ${result.publicKey}`)
}

const main = async (): Promise<void> => {
	const args = parseArgs(Bun.argv.slice(2))

	if (args.help) {
		console.log(USAGE)
		return
	}

	const mode = args.mode as Mode | undefined
	if (!mode || !["mnemonic", "private-key", "public-key"].includes(mode)) {
		console.error("Error: --mode must be one of: mnemonic, private-key, public-key")
		console.error(USAGE)
		process.exit(1)
	}

	const style = args.style || "cosmos"
	const keyType = STYLE_TO_KEY_TYPE[style]
	if (!keyType) {
		console.error("Error: --style must be one of: evm, cosmos")
		process.exit(1)
	}

	const prefix = args.prefix || "sei"

	if (mode === "mnemonic") {
		const mnemonic = await getSecret("MNEMONIC")
		if (!mnemonic) {
			console.error("Error: No mnemonic provided. Set $MNEMONIC or pipe to stdin.")
			process.exit(1)
		}

		const derivationPath = args.path || DEFAULT_PATH[style]
		const privateKeyHex = Buffer.from(
			getPrivateKeyFromMnemonic(mnemonic, derivationPath)
		).toString("hex")
		const result = generateAddressesFromPrivateKey(privateKeyHex, prefix, keyType)
		printResult(result, prefix)
		return
	}

	if (mode === "private-key") {
		const privateKey = await getSecret("PRIVATE_KEY")
		if (!privateKey) {
			console.error("Error: No private key provided. Set $PRIVATE_KEY or pipe to stdin.")
			process.exit(1)
		}

		const result = generateAddressesFromPrivateKey(privateKey, prefix, keyType)
		printResult(result, prefix)
		return
	}

	const publicKeyInput = await getSecret("PUBLIC_KEY")
	if (!publicKeyInput) {
		console.error("Error: No public key provided. Set $PUBLIC_KEY or pipe to stdin.")
		process.exit(1)
	}

	const publicKeyHex = isLikelyBase64(publicKeyInput)
		? base64ToHex(publicKeyInput)
		: publicKeyInput
	const publicKeyBytes = Uint8Array.from(Buffer.from(publicKeyHex, "hex"))
	const { address, ethAddress } = generateAddressesFromPublicKey(publicKeyBytes, prefix, keyType)

	console.log(`${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Address: ${address}`)
	console.log(`Ethereum Address: ${ethAddress}`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
