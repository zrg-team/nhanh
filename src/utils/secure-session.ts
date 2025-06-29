import CryptoJS from 'crypto-js'

class SecureSessionMemory {
  private sessionKey: string
  private loadded = false
  private sessionMemory = new Map<string, string>() // store as hex string

  constructor() {
    this.init()
  }

  private async init() {
    if (this.loadded) {
      return
    }
    this.sessionMemory = new Map<string, string>()
    // Generate a random 256-bit key (32 bytes)
    this.sessionKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex)
    this.loadded = true
  }

  async reload() {
    this.loadded = false
    await this.init()
  }

  async set(key: string, value: string) {
    // Generate a random 16-byte IV for each value
    const iv = CryptoJS.lib.WordArray.random(16)
    const keyWord = CryptoJS.enc.Hex.parse(this.sessionKey)
    const encrypted = CryptoJS.AES.encrypt(value, keyWord, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })
    // Store IV + ciphertext as hex (IV is needed for decryption)
    const stored = iv.toString(CryptoJS.enc.Hex) + encrypted.ciphertext.toString(CryptoJS.enc.Hex)
    this.sessionMemory.set(key, stored)
  }

  async get(key: string) {
    const stored = this.sessionMemory.get(key)
    if (!stored) return null
    // Extract IV and ciphertext
    const ivHex = stored.slice(0, 32) // 16 bytes IV
    const ciphertextHex = stored.slice(32)
    const iv = CryptoJS.enc.Hex.parse(ivHex)
    const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex)
    const keyWord = CryptoJS.enc.Hex.parse(this.sessionKey)
    // Create CipherParams object for decryption
    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext })
    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWord, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })
    return decrypted.toString(CryptoJS.enc.Utf8)
  }

  async exists(key: string) {
    return this.sessionMemory.has(key)
  }
}

const secureSession = new SecureSessionMemory()

export default secureSession
