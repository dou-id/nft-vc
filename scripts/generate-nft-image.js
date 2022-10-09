//
// generate NFT images from templates/nft.svg and members.json
//
// How to use:
// $ node scripts/generate-nft-image.js <INPUT_JSON>
//
// e.g.
// $ node scripts/generate-nft-image.js ./tmp/members.json

const fs = require("fs")
const path = require("path")

const canvas = require("canvas")
const canvg = require("canvg")
const fetch = require("node-fetch")
const xmldom = require("xmldom")

const [WIDTH, HEIGHT] = [700, 700]
const OUTPUT_IMAGE_DIR = path.join(__dirname, "../output/nft_images")
const { cleanupOutputDir, isProduction } = require("./utils")

const getTemplateFileName = (credentialId) => {
  switch (credentialId) {
    // credentialIdによって、テンプレート変更する場合に条件追加
    default:
      return "nft-test.svg"
  }
}

const preset = canvg.presets.node({
  DOMParser: xmldom.DOMParser,
  canvas,
  fetch,
})

const generate = async (member) => {
  const outputFile = path.join(OUTPUT_IMAGE_DIR, `${member.id}.png`)

  const templateFileName = getTemplateFileName(member.credential_id)
  const templatePath = path.join(
    __dirname,
    `./../templates/${templateFileName}`
  )

  if (templatePath.endsWith(".svg")) {
    const svg = fs.readFileSync(templatePath, "utf8")
    // convert SVG to PNG
    const c = preset.createCanvas(WIDTH, HEIGHT)
    const ctx = c.getContext("2d")
    const v = canvg.Canvg.fromString(ctx, svg, preset)
    await v.render()
    const png = c.toBuffer()

    fs.writeFileSync(outputFile, png)
  } else {
    fs.copyFileSync(templatePath, outputFile)
  }

  return outputFile
}

const main = async () => {
  if (process.argv.length !== 3) {
    console.log("[ERROR] input file and output dir must be specified.")
    return
  }

  const membersJsonPath = process.argv[2]
  const members = JSON.parse(fs.readFileSync(membersJsonPath, "utf8"))
  await cleanupOutputDir(OUTPUT_IMAGE_DIR, ".png")

  let cnt = 0
  const total = members.length
  for (const member of members) {
    cnt += 1
    console.log(`[${cnt}/${total}] Generating a NFT image: ${member.id}`)
    const imagePath = await generate(member)
    member.nft_image_path = imagePath
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
