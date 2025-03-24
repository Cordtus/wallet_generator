import { BIP32Factory } from "bip32"
import { mnemonicToSeedSync, validateMnemonic } from "bip39"
import * as ecc from "tiny-secp256k1"

const bip32 = BIP32Factory(ecc)

export const getPrivateKeyFromMnemonic = (mnemonic: string, derivationPath: string): Uint8Array => {
	if (!validateMnemonic(mnemonic)) {
		throw new Error(`Invalid mnemonic: ${mnemonic}`)
	}
	const seed = mnemonicToSeedSync(mnemonic)
	const hdwallet = bip32.fromSeed(seed)
	const derivedNode = hdwallet.derivePath(derivationPath)
	const privateKey = derivedNode.privateKey
	if (!privateKey) {
		throw new Error("Unable to derive private key from mnemonic and path.")
	}
	return privateKey
}
