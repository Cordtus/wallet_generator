export const convertBits = (
	data: Uint8Array,
	fromBits: number,
	toBits: number,
	pad: boolean
): number[] => {
	let acc = 0
	let bits = 0
	const result: number[] = []
	const maxv = (1 << toBits) - 1
	for (const value of data) {
		acc = (acc << fromBits) | value
		bits += fromBits
		while (bits >= toBits) {
			bits -= toBits
			result.push((acc >> bits) & maxv)
		}
	}
	if (pad) {
		if (bits > 0) {
			result.push((acc << (toBits - bits)) & maxv)
		}
	} else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
		throw new Error("Unable to convert bits")
	}
	return result
}
