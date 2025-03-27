import { describe, expect, it } from "bun:test"
import { generateAddressesFromPublicKey } from "../src/utils/crypto"

describe("Base64 Public Key Handling", () => {
    it("should correctly convert base64 public key and generate address", () => {
        // This is the base64 of a compressed public key
        const base64PublicKey = "AzMDx9YcjoWC3m7VLmInQI65V6vJjvV1lRTNrBu1zQpC"
        
        // Expected hex after conversion
        const expectedHex = "033303c7d61c8e8582de6ed52e6227408eb957abc98ef5759514cdac1bb5cd0a42"
        
        // Convert base64 to hex
        const hexPublicKey = Buffer.from(base64PublicKey, "base64").toString("hex")
        
        // Remove any newlines or whitespace (which might appear in some base64 conversions)
        const cleanHex = hexPublicKey.replace(/\s+/g, "")
        
        // Check conversion
        expect(cleanHex).toEqual(expectedHex)
        
        // Test address generation with the converted key
        const publicKeyBytes = Uint8Array.from(Buffer.from(cleanHex, "hex"))
        const prefix = "sei"
        const { address } = generateAddressesFromPublicKey(publicKeyBytes, prefix)
        
        // Verify the address starts with the prefix
        expect(address).toMatch(/^sei1/)
    })
    
    it("should handle base64 with newlines correctly", () => {
        // Base64 string that might contain a newline when decoded to hex
        const badBase64 = "AzMDx9YcjoWC3m7VLmInQI65V6vJjvV1lRTNrBu1\nzQpC" 
        
        // Expected clean hex
        const expectedHex = "033303c7d61c8e8582de6ed52e6227408eb957abc98ef5759514cdac1bb5cd0a42"
        
        // Convert with potential newlines
        const hexWithNewlines = Buffer.from(badBase64.replace(/\s+/g, ""), "base64").toString("hex")
        
        // Clean the hex
        const cleanHex = hexWithNewlines.replace(/\s+/g, "")
        
        // Verify we get the clean hex
        expect(cleanHex).toEqual(expectedHex)
    })
})
