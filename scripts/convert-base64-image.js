//
// convert into base64 from a image file
//
// How to use:
// $ node scripts/convert-base64-image.js <image-file-path> <jpeg|png>
//
// e.g.
// $ node scripts/convert-base64-image.js ./examples/logo.jpg jpeg
// $ node scripts/convert-base64-image.js ./examples/logo.png png
//

const imageFilepath = process.argv[2]
const mimeImageType = process.argv[3]

const { encodeBase64FromImage } = require("./utils")
const base64Data = encodeBase64FromImage(imageFilepath, mimeImageType)
console.log(base64Data)
