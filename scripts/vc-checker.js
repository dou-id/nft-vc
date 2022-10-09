//
// for decode proofValue and check
//
// How to use:
// $ node scripts/vc-checker {{proofValue}}
//

const { Decoder } = require('@vaultie/lds-merkle-proof-2019')

if (process.argv.length !== 3) {
  console.log("[ERROR] must input proof value.")
  return
}

const proofValueBase58 = process.argv[2]
const decoder = new Decoder(proofValueBase58)
console.log(decoder.decode())
