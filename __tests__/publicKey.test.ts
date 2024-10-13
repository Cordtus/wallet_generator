jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ mode: 'Public Key' }),
}));

import { generateAddressesFromPublicKey } from '../src/genWallet';

const base64PublicKey = 'A7z8ZtJ6xR0UbK7nOX2VbAwF2fgwpRZmDzMA6fYrReht'; 
const publicKeyUint8Array = new Uint8Array([3, 188, 252, 102, 210, 122, 197, 29, 20, 108, 174, 231, 57, 125, 149, 108, 12, 5, 217, 
  248, 48, 165, 22, 102, 15, 51, 0, 233, 246, 43, 69, 232, 109]);
const hexPublicKey = '03bcfc66d27ac51d146caee7397d956c0c05d9f830a516660f3300e9f62b45e86d'; 

function decodePublicKey(input: string | Uint8Array): Uint8Array {
  if (typeof input === 'string') {
    if (input.length === 66) {
      return Uint8Array.from(Buffer.from(input, 'hex'));
    } else {
      return Uint8Array.from(Buffer.from(input, 'base64'));
    }
  }
  return input;
}

describe('Public Key Tests', () => {
  it('should generate a valid Bech32 address from a base64-encoded public key', () => {
    const publicKey = decodePublicKey(base64PublicKey);
    const prefix = 'cosmos';

    const { address } = generateAddressesFromPublicKey(publicKey, prefix);
    expect(address).toMatch(/[a-z0-9]+1[a-z0-9]{38}/);
  });

  it('should generate a valid Bech32 address from a Uint8Array public key', () => {
    const publicKey = decodePublicKey(publicKeyUint8Array);
    const prefix = 'cosmos';

    const { address } = generateAddressesFromPublicKey(publicKey, prefix);
    expect(address).toMatch(/[a-z0-9]+1[a-z0-9]{38}/);
  });

  it('should generate a valid Bech32 address from a hex-encoded public key', () => {
    const publicKey = decodePublicKey(hexPublicKey);
    const prefix = 'cosmos';

    const { address } = generateAddressesFromPublicKey(publicKey, prefix);
    expect(address).toMatch(/[a-z0-9]+1[a-z0-9]{38}/);
  });
});
