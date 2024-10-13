jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ mode: 'Mnemonic' }),
}));

import { getPrivateKeyFromMnemonic } from '../src/genWallet'; 
import { validateMnemonic } from 'bip39';

describe('Mnemonic Seed Tests', () => {
  const valid12WordMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const valid24WordMnemonic = 'film agree blanket awkward able among exact visit envelope arm zero catalog shrug artwork bridge egg wear breeze person angry job rabbit man thank';
  const invalidMnemonic = 'this is an invalid mnemonic and it should fail';

  const derivationPath = "m/44'/118'/0'/0/0"; 

  it('should generate a valid private key from a 12-word mnemonic', () => {
    const privateKey = getPrivateKeyFromMnemonic(valid12WordMnemonic, derivationPath);
    expect(privateKey).toBeDefined();
    expect(privateKey.length).toBe(32); 
  });

  it('should generate a valid private key from a 24-word mnemonic', () => {
    const privateKey = getPrivateKeyFromMnemonic(valid24WordMnemonic, derivationPath);
    expect(privateKey).toBeDefined();
    expect(privateKey.length).toBe(32); 
  });

  it('should return false for an invalid mnemonic', () => {
    const isValid = validateMnemonic(invalidMnemonic);
    expect(isValid).toBe(false);
  });

  it('should throw an error for deriving a private key from an invalid mnemonic', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error
    expect(() => {
      getPrivateKeyFromMnemonic(invalidMnemonic, derivationPath);
    }).toThrow('Invalid mnemonic');
    consoleErrorSpy.mockRestore(); // Restore console.error after the test
  });
});
