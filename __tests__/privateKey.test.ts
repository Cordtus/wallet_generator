jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ mode: 'Private Key' }),
}));

import { generateAddressesFromPrivateKey } from '../src/genWallet';

describe('Private Key Tests', () => {
  const privateKeyHex = '30e60e7d56ffaa11dab5eac70acbb2601df6b685353264e03a551c02433320d1';

  it('should generate valid Bech32 and Ethereum addresses from private key', () => {
    const prefix = 'cosmos'; 
    const { address, ethAddress } = generateAddressesFromPrivateKey(privateKeyHex, prefix);

    expect(address).toBe('cosmos1085uayqujzd9fj9j7emw5zsua3vgzx708932tt');
    expect(ethAddress).toBe('0xd0800523100506f2836f9401110755cb3d758205');
  });
});
