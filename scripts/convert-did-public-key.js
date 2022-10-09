//
// convert into public key(JWK) from Ethereum's private key
//
// How to use:
// $ node scripts/convert-did-public-key.js <private-key-path>
//
// e.g.
// $ node scripts/convert-did-public-key.js ./keys/wallet-private.dev.key
//

const fs = require("fs")
const keyto = require("@trust/keyto")

const keyFilepath = process.argv[2]
const privateKey = fs.readFileSync(keyFilepath, "utf-8")
const keyJwk = keyto.from(privateKey, "blk").toJwk("public")

console.log(JSON.stringify(keyJwk))
