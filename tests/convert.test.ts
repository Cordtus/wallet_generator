import { describe, expect, it } from "bun:test"
import { convertBits } from "../src/utils/convert"

describe("convertBits", () => {
	it("should convert bits correctly with padding", () => {
		const input = Uint8Array.from([255])
		const result = convertBits(input, 8, 5, true)
		// 255 in binary is 11111111, which converts to [31, 28] when padded
		const expected = [31, 28]
		expect(result).toEqual(expected)
	})

	it("should throw an error when padding is false and bits remain", () => {
		const input = Uint8Array.from([255])
		expect(() => convertBits(input, 8, 5, false)).toThrow()
	})
})
