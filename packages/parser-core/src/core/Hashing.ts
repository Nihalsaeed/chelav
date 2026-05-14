import * as Crypto from 'expo-crypto';

export async function md5Hex(input: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    input,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return digest;
}