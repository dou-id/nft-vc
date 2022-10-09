//
// generate VC images from templates/vc-xxx.svg and members.json
//
// How to use:
// $ node scripts/generate-vc-image.js <INPUT_JSON>
//
// e.g.
// $ node scripts/generate-vc-image.js ./tmp/members.json

const fs = require("fs")
const path = require("path")

const {
  getIssuanceDateFormat,
  cleanupOutputDir,
  isProduction,
} = require("./utils")

const OUTPUT_IMAGE_DIR = path.join(__dirname, "../output/vc_images")
const ISSUANCE_DATE_FORMAT = getIssuanceDateFormat()

const getTemplateFileName = (credentialId) => {
  switch (credentialId) {
    // credentialIdによって、テンプレート変更する場合に条件追加
    default:
      return "vc-test.svg"
  }
}

const mLength = (str) => {
  let len = 0
  for (let i = 0; i < str.length; i++) {
    str[i].match(/[ -~]/) ? (len += 1) : (len += 2)
  }
  return len
}

// 直線 "y = ax + b" で最適なfontSizeを導く関数
const getHolderNameFontSize = (holderName) => {
  const MAX_FONT_SIZE = 1

  // 直線を引く座標 2点
  const coordinate1 = { fontSize: 1, length: 9 } // デザイン納品時のfontSizeのまま入る最大文字列長
  const coordinate2 = { fontSize: 0.45, length: 29 } // 最大文字列長データに合わせて決めたfontSize

  // 傾き (a)
  const slope =
    (coordinate2.fontSize - coordinate1.fontSize) /
    (coordinate2.length - coordinate1.length)
  // 切片 (b)
  const yIntercept = coordinate1.fontSize - slope * coordinate1.length

  const fontSize = (slope * mLength(holderName) + yIntercept).toFixed(2)
  return fontSize > MAX_FONT_SIZE ? MAX_FONT_SIZE : fontSize
}

const generate = async (member, notoFontData) => {
  const outputFile = path.join(OUTPUT_IMAGE_DIR, `${member.id}.svg`)

  // read template svg
  const templateFileName = getTemplateFileName(member.credential_id)
  const templatePath = path.join(
    __dirname,
    `./../templates/${templateFileName}`
  )
  const template = fs.readFileSync(templatePath, "utf8")

  // replace each placeholder with member's info
  const svg = template
    .replaceAll("{{CREDENTIAL_NAME}}", member.credential_name)
    .replaceAll("{{HOLDER_NAME}}", member.holder_name)
    .replaceAll(
      "{{HOLDER_NAME_FONT_SIZE}}",
      `${getHolderNameFontSize(member.holder_name)}px`
    )
    .replaceAll("{{ISSUANCE_DATE}}", ISSUANCE_DATE_FORMAT)

  fs.writeFileSync(outputFile, svg)
  return outputFile
}

const main = async () => {
  if (process.argv.length !== 3) {
    console.log("[ERROR] input file and output dir must be specified.")
    return
  }

  const membersJsonPath = process.argv[2]
  const members = JSON.parse(fs.readFileSync(membersJsonPath, "utf8"))
  const notoFontData = fs.readFileSync(
    path.join(__dirname, `./../templates/fonts/NotoSansJP-Light.base64.txt`)
  )
  await cleanupOutputDir(OUTPUT_IMAGE_DIR, ".svg")

  let cnt = 0
  const total = members.length
  for (const member of members) {
    cnt += 1
    console.log(`[${cnt}/${total}] Generating a VC image: ${member.id}`)
    const imagePath = await generate(member, notoFontData)
    member.vc_image_path = imagePath
  }

  // update members.json to add the generated image paths
  fs.writeFileSync(membersJsonPath, JSON.stringify(members))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
