//
// generate unsigned VCs from members.json.
//
// How to use:
// $ node scripts/generate-unsigned-vc.js <MEMBERS_JSON>
//
// e.g.
// $ node scripts/generate-unsigned-vc.js ./tmp/members.json
//

const fs = require("fs")
const path = require("path")
const uuidv4 = require("uuid").v4

const {
  ISSUANCE_DATE,
  isProduction,
  cleanupOutputDir,
  getTokenDescription,
  getTokenJapaneseDescription,
} = require("./utils")

const {
  ISSUER_DID_PRD,
  ISSUER_DID_DEV
} = process.env

const OUPUT_UNSIGNED_VC_DIR = path.join(
  __dirname,
  "../output/unsigned_certificates"
)
const OUPUT_SIGNED_VC_DIR = path.join(
  __dirname,
  "../output/blockchain_certificates"
)
const issuerDID = isProduction()
  ? ISSUER_DID_PRD
  : ISSUER_DID_DEV
const UUID_PREFIX = "arn:uuid:"

const TEMPLATE_VC = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/blockcerts/v3",
  ],
  type: ["VerifiableCredential"],
}

const generateVC = (member, date = null) => {
  const metadataBody = {
    title: member.credential_name,
    description: getTokenDescription(),
    descriptionJp: getTokenJapaneseDescription(),
  }
  const vc = Object.assign({}, TEMPLATE_VC)
  vc.id = `${UUID_PREFIX}${member.id}`
  vc.issuer = issuerDID
  vc.issuanceDate = generateIssuanceDate(ISSUANCE_DATE)
  vc.metadata = JSON.stringify(metadataBody)
  vc.display = {
    contentMediaType: "image/svg+xml",
    contentEncoding: "base64",
    content: fs.readFileSync(member.vc_image_path).toString("base64"),
  }
  vc.nonce = uuidv4()
  vc.credentialSubject = {
    id: `did:ethr:${member.holder_wallet_address}`,
  }
  return vc
}

const generateIssuanceDate = (date = null) => {
  date = date || new Date()
  return date.toISOString().split("Z")[0].split(".")[0] + "Z"
}

const main = async () => {
  if (process.argv.length !== 3) {
    console.log("[ERROR] input file and output dir must be specified.")
    return
  }

  if (!issuerDID) {
    console.log("[ERROR] ENV ISSUER_DID is not set.")
    return
  }

  const membersJsonPath = process.argv[2]
  const members = JSON.parse(fs.readFileSync(membersJsonPath, "utf8"))

  await cleanupOutputDir(OUPUT_UNSIGNED_VC_DIR, ".json")
  await cleanupOutputDir(OUPUT_SIGNED_VC_DIR, ".json")

  let cnt = 0
  const total = members.length
  const result = []
  for (const member of members) {
    cnt += 1
    const vc = generateVC(member)
    const fileName = `${member.id}.json`
    const filePath = path.join(OUPUT_UNSIGNED_VC_DIR, fileName)
    console.log(`[${cnt}/${total}] saved ${filePath}`)
    fs.writeFileSync(filePath, JSON.stringify(vc))
    result.push(filePath)
    member.vc_path = path.join(OUPUT_SIGNED_VC_DIR, fileName)
  }
  // update members.json to add expected signed VC's paths
  fs.writeFileSync(membersJsonPath, JSON.stringify(members))
  return result
}

main()
  .then((_) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
