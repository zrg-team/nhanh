import forge from 'node-forge'

function _base64StringToArrayBuffer(b64str: string) {
  const byteStr = atob(b64str)
  const bytes = new Uint8Array(byteStr.length)
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i)
  }
  return bytes.buffer
}

function _arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  const byteArray = new Uint8Array(arrayBuffer)
  let byteString = ''
  for (let i = 0; i < byteArray.byteLength; i++) {
    byteString += String.fromCharCode(byteArray[i])
  }
  const b64 = window.btoa(byteString)

  return b64
}

export function convertPemToBinary(pem: string) {
  const lines = pem.split('\n')
  let encoded = ''
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].trim().length > 0 &&
      lines[i].indexOf('-----BEGIN RSA PRIVATE KEY-----') < 0 &&
      lines[i].indexOf('-----BEGIN PUBLIC KEY-----') < 0 &&
      lines[i].indexOf('-----END RSA PRIVATE KEY-----') < 0 &&
      lines[i].indexOf('-----END PUBLIC KEY-----') < 0
    ) {
      encoded += lines[i].trim()
    }
  }
  return _base64StringToArrayBuffer(encoded)
}

function addNewLines(str: string) {
  let finalString = ''
  while (str.length > 0) {
    finalString += str.substring(0, 64) + '\n'
    str = str.substring(64)
  }

  return finalString
}

export function toPrivatePem(privateKey: ArrayBuffer) {
  const b64 = addNewLines(_arrayBufferToBase64(privateKey))
  const pem = '-----BEGIN RSA PRIVATE KEY-----\n' + b64 + '-----END RSA PRIVATE KEY-----'

  return pem
}

export function toPublicPem(privateKey: ArrayBuffer) {
  const b64 = addNewLines(_arrayBufferToBase64(privateKey))
  const pem = '-----BEGIN PUBLIC KEY-----\n' + b64 + '-----END PUBLIC KEY-----'

  return pem
}

export const generateRSAKeyPair = async () => {
  return new Promise<{ publicKey: string; privateKey: string }>((resolve) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keypair) => {
      if (err) throw err
      const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey)
      const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey)
      resolve({ publicKey: publicKeyPem, privateKey: privateKeyPem })
    })
  })
}

export const encryptRsa = async (fileArrayBuffer: ArrayBuffer, pemString: string) => {
  const publicKey = forge.pki.publicKeyFromPem(pemString)
  const buffer = new Uint8Array(fileArrayBuffer)
  const bufferString = String.fromCharCode(...buffer)
  const encrypted = publicKey.encrypt(bufferString, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
  })
  // Return as ArrayBuffer
  return Uint8Array.from(encrypted, (c) => c.charCodeAt(0)).buffer
}

export const decryptRsa = async (fileArrayBuffer: ArrayBuffer, pemString: string) => {
  const privateKey = forge.pki.privateKeyFromPem(pemString)
  const buffer = new Uint8Array(fileArrayBuffer)
  const decrypted = privateKey.decrypt(String.fromCharCode(...buffer), 'RSA-OAEP', {
    md: forge.md.sha256.create(),
  })
  // Return as ArrayBuffer
  const decryptedBuffer = new Uint8Array(decrypted.length)
  for (let i = 0; i < decrypted.length; i++) {
    decryptedBuffer[i] = decrypted.charCodeAt(i)
  }
  return decryptedBuffer.buffer
}

export const encryptStringRsa = async (str: string, pemString: string) => {
  const buffer = new TextEncoder().encode(str).buffer
  const encrypted = await encryptRsa(buffer, pemString)
  return _arrayBufferToBase64(encrypted)
}

export const decryptStringRsa = async (str: string, pemString: string) => {
  const buffer = _base64StringToArrayBuffer(str)
  const decrypted = await decryptRsa(buffer, pemString)
  const uint8Array = new Uint8Array(decrypted)
  const textDecoder = new TextDecoder()
  return textDecoder.decode(uint8Array)
}
