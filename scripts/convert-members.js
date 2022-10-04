//
// convert into JSON from Google Form CSV.
//
// How to use:
// $ node scripts/convert-members.js <INPUT_CSV>
//
// e.g.
// $ node scripts/convert-members.js ./tmp/form.csv > ./tmp/members.json
//

const csv = require("csvtojson")
const uuidv4 = require("uuid").v4

const fieldNameMap = {
  LECTURE_ID: "credential_id",
  LECTURE_NAME: "credential_name",
  STUDENT_ID: "holder_id",
  STUDENT_NAME: "holder_name",
  WALLET_ADDRESS: "holder_wallet_address",
}

const ETHEREUM_WALLET_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
function isEthereumAddress(address) {
  return !!address.match(ETHEREUM_WALLET_ADDRESS_RE)
}

async function main() {
  if (process.argv.length !== 3) {
    console.log("[ERROR] input file must be specified.")
    return
  }
  const inputCsv = process.argv[2]
  const rawItems = await csv().fromFile(inputCsv)

  const items = []
  rawItems.forEach((rawItem) => {
    const item = { id: uuidv4() }
    Object.keys(fieldNameMap).forEach((rawField) => {
      const field = fieldNameMap[rawField]
      let value = rawItem[rawField]
      if (field === "holder_name") {
        value = value.replaceAll("　", " ").replaceAll(/ +/g, " ")
      }
      rawField
      if (field === "holder_wallet_address") {
        if (!isEthereumAddress(value)) {
          console.error(
            `(WARNING LINE=${items.length + 1}) The address is INVALID.`
          )
        }
      }
      item[field] = value
    })
    items.push(item)
  })
  return items
}

main()
  .then((items) => {
    console.log(JSON.stringify(items))
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
