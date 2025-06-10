jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ mode: 'Private Key' }),
}));

import { generateAddressesFromPrivateKey, KeyType } from '../src/genWallet';

describe('Private Key Tests', () => {
  const privateKeyHex = '30e60e7d56ffaa11dab5eac70acbb2601df6b685353264e03a551c02433320d1';

  it('should generate valid Bech32 and Ethereum addresses from private key (CANONICAL)', () => {
    const prefix = 'cosmos'; 
    const { address, ethAddress } = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.CANONICAL);

    expect(address).toBe('cosmos1085uayqujzd9fj9j7emw5zsua3vgzx708932tt');
    expect(ethAddress).toBe('0xd0800523100506f2836f9401110755cb3d758205');
  });

  it('should generate valid addresses from private key (ETH_SECP256K1)', () => {
    const prefix = 'cosmos'; 
    const { address, ethAddress } = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.ETH_SECP256K1);

    expect(address).toMatch(/cosmos1[a-z0-9]{38}/);
    expect(ethAddress).toBe('0xd0800523100506f2836f9401110755cb3d758205');
    expect(address).not.toBe('cosmos1085uayqujzd9fj9j7emw5zsua3vgzx708932tt');
  });

  it('should generate valid addresses from private key (SECP256K1)', () => {
    const prefix = 'cosmos'; 
    const { address, ethAddress } = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.SECP256K1);

    expect(address).toBe('cosmos1085uayqujzd9fj9j7emw5zsua3vgzx708932tt');
    expect(ethAddress).toMatch(/^0x[a-f0-9]{40}$/);
    expect(ethAddress).not.toBe('0xd0800523100506f2836f9401110755cb3d758205');
  });

  it('should default to CANONICAL when no keyType provided', () => {
    const prefix = 'cosmos'; 
    const canonical = generateAddressesFromPrivateKey(privateKeyHex, prefix, KeyType.CANONICAL);
    const defaultResult = generateAddressesFromPrivateKey(privateKeyHex, prefix);

    expect(defaultResult.address).toBe(canonical.address);
    expect(defaultResult.ethAddress).toBe(canonical.ethAddress);
  });
});
