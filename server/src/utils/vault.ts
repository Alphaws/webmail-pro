import CryptoJS from 'crypto-js';

export class Vault {
  static encrypt(text: string, key: string): string {
    return CryptoJS.AES.encrypt(text, key).toString();
  }

  static decrypt(ciphertext: string, key: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  /**
   * Derives a vault key from the user's master password and salt.
   */
  static deriveKey(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 512 / 32,
      iterations: 10000
    }).toString();
  }
}
