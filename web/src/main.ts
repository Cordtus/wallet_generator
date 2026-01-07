/**
 * Main entry point for the wallet generator web UI
 * Handles DOM interactions and calls wallet generation functions
 */
import * as bip39 from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english"
import {
	type KeyType,
	bytesToHex,
	generateAddressesFromPrivateKey,
	generateAddressesFromPublicKey,
	getPrivateKeyFromMnemonic,
	hexToBytes,
	validateDerivationPath,
	validateMnemonic,
	validatePrefix,
	validatePrivateKey,
	validatePublicKey
} from "./wallet.js"

const TEST_MNEMONIC =
	"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

type Mode = "mnemonic" | "privatekey" | "publickey"
let currentMode: Mode = "mnemonic"
let currentKeyType: KeyType = "secp256k1"

/**
 * Update the output display
 */
const setOutput = (content: string, isError = false): void => {
	const result = document.getElementById("result")
	if (!result) return

	result.textContent = content
	result.className = isError ? "output error" : "output"
}

/**
 * Format output as structured rows
 */
const formatOutput = (data: Record<string, string>): string => {
	return Object.entries(data)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n")
}

/**
 * Generate a new random mnemonic
 */
const generateNewMnemonic = (): void => {
	try {
		const entropy = crypto.getRandomValues(new Uint8Array(16))
		const mnemonic = bip39.entropyToMnemonic(entropy, wordlist)

		const mnemonicInput = document.getElementById("mnemonic") as HTMLTextAreaElement
		if (mnemonicInput) {
			mnemonicInput.value = mnemonic
		}

		setOutput('New mnemonic generated. Click "Generate Addresses" to continue.')
	} catch (e) {
		setOutput(`Error generating mnemonic: ${(e as Error).message}`, true)
	}
}

/**
 * Load the test mnemonic
 */
const useTestMnemonic = (): void => {
	const mnemonicInput = document.getElementById("mnemonic") as HTMLTextAreaElement
	if (mnemonicInput) {
		mnemonicInput.value = TEST_MNEMONIC
	}
	setOutput('Test mnemonic loaded. Click "Generate Addresses" to continue.')
}

/**
 * Switch between input modes
 */
const switchMode = (mode: Mode): void => {
	currentMode = mode

	for (const tab of document.querySelectorAll(".mode-tab")) {
		tab.classList.remove("active")
		if (tab.getAttribute("data-mode") === mode) {
			tab.classList.add("active")
		}
	}

	for (const section of document.querySelectorAll(".mode-section")) {
		section.classList.remove("active")
	}

	const activeSection = document.getElementById(`${mode}-section`)
	if (activeSection) {
		activeSection.classList.add("active")
	}

	setOutput('Select a mode and click "Generate Addresses"')
}

/**
 * Switch between key types
 */
const switchKeyType = (keyType: KeyType): void => {
	currentKeyType = keyType

	for (const tab of document.querySelectorAll(".key-type-tab")) {
		tab.classList.remove("active")
		if (tab.getAttribute("data-keytype") === keyType) {
			tab.classList.add("active")
		}
	}
}

/**
 * Handle mnemonic mode derivation
 */
const deriveMnemonic = (): void => {
	const mnemonicInput = document.getElementById("mnemonic") as HTMLTextAreaElement
	const pathInput = document.getElementById("path") as HTMLInputElement
	const prefixInput = document.getElementById("prefix") as HTMLInputElement

	const mnemonic = mnemonicInput?.value.trim() || ""
	const path = pathInput?.value.trim() || ""
	const prefix = prefixInput?.value.trim() || ""

	const mnemonicError = validateMnemonic(mnemonic)
	if (mnemonicError) {
		setOutput(`Mnemonic Error: ${mnemonicError}`, true)
		return
	}

	const pathError = validateDerivationPath(path)
	if (pathError) {
		setOutput(`Path Error: ${pathError}`, true)
		return
	}

	const prefixError = validatePrefix(prefix)
	if (prefixError) {
		setOutput(`Prefix Error: ${prefixError}`, true)
		return
	}

	try {
		const privateKey = getPrivateKeyFromMnemonic(mnemonic, path)
		const privateKeyHex = bytesToHex(privateKey)
		const result = generateAddressesFromPrivateKey(privateKeyHex, prefix, currentKeyType)

		const displayPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1)
		const output = formatOutput({
			"Key Type": currentKeyType,
			[`${displayPrefix} Address`]: result.address,
			"Ethereum Address": result.ethAddress,
			"Private Key": result.privateKey,
			"Public Key": result.publicKey
		})

		setOutput(output)
	} catch (e) {
		setOutput(`Error: ${(e as Error).message}`, true)
	}
}

/**
 * Handle private key mode derivation
 */
const derivePrivateKey = (): void => {
	const privateKeyInput = document.getElementById("privatekey") as HTMLInputElement
	const prefixInput = document.getElementById("prefix") as HTMLInputElement

	const privateKey = privateKeyInput?.value.trim() || ""
	const prefix = prefixInput?.value.trim() || ""

	const keyError = validatePrivateKey(privateKey)
	if (keyError) {
		setOutput(`Private Key Error: ${keyError}`, true)
		return
	}

	const prefixError = validatePrefix(prefix)
	if (prefixError) {
		setOutput(`Prefix Error: ${prefixError}`, true)
		return
	}

	try {
		const result = generateAddressesFromPrivateKey(privateKey, prefix, currentKeyType)

		const displayPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1)
		const output = formatOutput({
			"Key Type": currentKeyType,
			[`${displayPrefix} Address`]: result.address,
			"Ethereum Address": result.ethAddress,
			"Private Key": result.privateKey,
			"Public Key": result.publicKey
		})

		setOutput(output)
	} catch (e) {
		setOutput(`Error: ${(e as Error).message}`, true)
	}
}

/**
 * Handle public key mode derivation
 * Supports both hex and base64 public key formats
 */
const derivePublicKey = (): void => {
	const publicKeyInput = document.getElementById("publickey") as HTMLInputElement
	const prefixInput = document.getElementById("prefix") as HTMLInputElement

	const publicKey = publicKeyInput?.value.trim() || ""
	const prefix = prefixInput?.value.trim() || ""

	const { error: keyError, hexKey } = validatePublicKey(publicKey)
	if (keyError) {
		setOutput(`Public Key Error: ${keyError}`, true)
		return
	}

	const prefixError = validatePrefix(prefix)
	if (prefixError) {
		setOutput(`Prefix Error: ${prefixError}`, true)
		return
	}

	try {
		const publicKeyBytes = hexToBytes(hexKey)
		const result = generateAddressesFromPublicKey(publicKeyBytes, prefix, currentKeyType)

		const displayPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1)
		const output = formatOutput({
			"Key Type": currentKeyType,
			[`${displayPrefix} Address`]: result.address,
			"Ethereum Address": result.ethAddress
		})

		setOutput(output)
	} catch (e) {
		setOutput(`Error: ${(e as Error).message}`, true)
	}
}

/**
 * Main derive handler - routes to appropriate mode handler
 */
const derive = (): void => {
	switch (currentMode) {
		case "mnemonic":
			deriveMnemonic()
			break
		case "privatekey":
			derivePrivateKey()
			break
		case "publickey":
			derivePublicKey()
			break
	}
}

/**
 * Initialize the application
 */
const init = (): void => {
	document.getElementById("btn-generate-mnemonic")?.addEventListener("click", generateNewMnemonic)
	document.getElementById("btn-test-mnemonic")?.addEventListener("click", useTestMnemonic)
	document.getElementById("btn-derive")?.addEventListener("click", derive)

	for (const tab of document.querySelectorAll(".mode-tab")) {
		tab.addEventListener("click", () => {
			const mode = tab.getAttribute("data-mode") as Mode
			if (mode) {
				switchMode(mode)
			}
		})
	}

	for (const tab of document.querySelectorAll(".key-type-tab")) {
		tab.addEventListener("click", () => {
			const keyType = tab.getAttribute("data-keytype") as KeyType
			if (keyType) {
				switchKeyType(keyType)
			}
		})
	}

	for (const btn of document.querySelectorAll(".preset-btn[data-path]")) {
		btn.addEventListener("click", () => {
			const path = btn.getAttribute("data-path")
			const pathInput = document.getElementById("path") as HTMLInputElement
			if (path && pathInput) {
				pathInput.value = path
			}
		})
	}

	for (const btn of document.querySelectorAll(".preset-btn[data-prefix]")) {
		btn.addEventListener("click", () => {
			const prefix = btn.getAttribute("data-prefix")
			const prefixInput = document.getElementById("prefix") as HTMLInputElement
			if (prefix && prefixInput) {
				prefixInput.value = prefix
			}
		})
	}
}

document.addEventListener("DOMContentLoaded", init)
