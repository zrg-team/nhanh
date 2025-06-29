import CryptoJS from 'crypto-js'

const _arrayBufferFromHexString = (hexString: string) => {
  const matches = hexString.match(/.{1,2}/g)
  if (!matches) {
    throw new Error('Invalid hexString')
  }
  const bytes = Uint8Array.from(matches.map((byte: unknown) => parseInt(byte as string, 16)))
  return bytes.buffer
}

export const _stringToArrayBuffer = (str: string) => {
  const encoder = new TextEncoder()
  return encoder.encode(str).buffer
}

const _digestMessage = async (message: string) => {
  // Use CryptoJS for SHA-256
  const hash = CryptoJS.SHA256(message)
  // Convert WordArray to ArrayBuffer
  const hex = hash.toString(CryptoJS.enc.Hex)
  return _arrayBufferFromHexString(hex)
}

const _arrayBufferToHexString = (buffer: ArrayBuffer) => {
  const byteArray = new Uint8Array(buffer)
  const hexCodes = [...byteArray].map((value) => {
    const hexCode = value.toString(16)
    const paddedHexCode = hexCode.padStart(2, '0')
    return paddedHexCode
  })
  return hexCodes.join('')
}

export const generatePassphrase = async () => {
  // Use CryptoJS random generator
  const passphrase = CryptoJS.lib.WordArray.random(32)
  const passphraseHex = passphrase.toString(CryptoJS.enc.Hex)
  return passphraseHex
}

export const getKeyFromPassphrase = async (passphrase: string) => {
  const key = await _digestMessage(passphrase)
  const keyHex = _arrayBufferToHexString(key)
  return keyHex
}

export const getIvFromPassphrase = async (passphrase: string) => {
  const keyHex = await getKeyFromPassphrase(passphrase)
  const ivHex = keyHex.substring(0, 32)
  return ivHex
}

export const encryptSymmetric = async (message: string, passphrase: string) => {
  const keyHex = await getKeyFromPassphrase(passphrase)
  const ivHex = await getIvFromPassphrase(passphrase)
  const key = CryptoJS.enc.Hex.parse(keyHex)
  const iv = CryptoJS.enc.Hex.parse(ivHex)
  const encrypted = CryptoJS.AES.encrypt(message, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex)
}

export const decryptSymmetric = async (encryptedHex: string, passphrase: string) => {
  const keyHex = await getKeyFromPassphrase(passphrase)
  const ivHex = await getIvFromPassphrase(passphrase)
  const key = CryptoJS.enc.Hex.parse(keyHex)
  const iv = CryptoJS.enc.Hex.parse(ivHex)
  const encrypted = CryptoJS.enc.Hex.parse(encryptedHex)
  const encryptedBase64 = CryptoJS.enc.Base64.stringify(encrypted)
  const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

export const encryptAes = async (fileArrayBuffer: ArrayBuffer, keyHex: string, ivHex: string) => {
  const key = CryptoJS.enc.Hex.parse(keyHex)
  const iv = CryptoJS.enc.Hex.parse(ivHex)
  const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(fileArrayBuffer))
  const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return _arrayBufferFromHexString(encrypted.ciphertext.toString(CryptoJS.enc.Hex))
}

export const decryptAes = async (fileArrayBuffer: ArrayBuffer, keyHex: string, ivHex: string) => {
  const key = CryptoJS.enc.Hex.parse(keyHex)
  const iv = CryptoJS.enc.Hex.parse(ivHex)
  const encryptedHex = _arrayBufferToHexString(fileArrayBuffer)
  const encrypted = CryptoJS.enc.Hex.parse(encryptedHex)
  const encryptedBase64 = CryptoJS.enc.Base64.stringify(encrypted)
  const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  // Convert WordArray to ArrayBuffer
  const decryptedBytes = decrypted.words
  const sigBytes = decrypted.sigBytes
  const u8 = new Uint8Array(sigBytes)
  for (let i = 0; i < sigBytes; ++i) {
    u8[i] = (decryptedBytes[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return u8.buffer
}
