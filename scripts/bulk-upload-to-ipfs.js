//
// bulk upload VCs or NFT images to IPFS
//
// How to use:
// $ node scripts/bulk-upload-to-ipfs.js <INPUT_JSON> <UPLOAD_TYPE>
//
// e.g.
// # UPLOAD_TYPE=vc
// $ node scripts/bulk-upload-to-ipfs.js ./tmp/members.json vc
//
// # UPLOAD_TYPE=nft
// $ node scripts/bulk-upload-to-ipfs.js ./tmp/members.json nft
//

const fs = require("fs")
const pinataSDK = require("@pinata/sdk")

const {
  PINATA_API_KEY,
  PINATA_SECRET_API_KEY,
} = process.env
const pinata = pinataSDK(PINATA_API_KEY, PINATA_SECRET_API_KEY)

const IPFS_FILE_NAME_PREFIX = {
  vc: "test-vc",
  nft: "test-nft",
}

UPLOAD_TYPE_VC = "vc"
UPLOAD_TYPE_NFT = "nft"

async function main() {
  if (process.argv.length !== 4) {
    console.log("[ERROR] input file must be specified.")
    return
  }

  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    console.log("[ERROR] PINATA_API_KEY or PINATA_SECRET_API_KEY is not set.")
    return
  }

  const membersJsonPath = process.argv[2]
  const members = JSON.parse(fs.readFileSync(membersJsonPath, "utf8"))

  const uploadType = process.argv[3].toLowerCase()
  if (![UPLOAD_TYPE_VC, UPLOAD_TYPE_NFT].includes(uploadType)) {
    console.log(
      `[ERROR] unknown UPLOAD_TYPE='${uploadType}'. UPLOAD_TYPE is only support for '${UPLOAD_TYPE_VC}' or '${UPLOAD_TYPE_NFT}'.`
    )
    return
  }

  const ipfsNamePrefix = IPFS_FILE_NAME_PREFIX[uploadType]
  let filePathField
  let outputField
  if (UPLOAD_TYPE_VC === uploadType) {
    filePathField = "vc_path"
    outputField = "vc_ipfs_hash"
  } else {
    filePathField = "nft_image_path"
    outputField = "nft_image_ipfs_hash"
  }

  const total = members.length
  let cnt = 0
  const results = []
  for (const member of members) {
    cnt += 1
    const ipfsName = `${ipfsNamePrefix}-${member.id}`.slice(0, 45) // Pinata spec. max length: 50
    console.log(
      `[${cnt}/${total}] Uploading to IPFS: vc=${member.id}, name=${ipfsName}`
    )
    const stream = fs.createReadStream(member[filePathField])
    const ipfsHash = (
      await pinata.pinFileToIPFS(stream, {
        pinataMetadata: {
          name: ipfsName,
        },
        pinataOptions: {
          cidVersion: 0,
        },
      })
    ).IpfsHash
    member[outputField] = ipfsHash
    results.push(ipfsHash)
  }
  // update members.json to add the URLs on IPFS
  fs.writeFileSync(membersJsonPath, JSON.stringify(members))
  return results
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
