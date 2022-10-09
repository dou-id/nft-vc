//
// Constants and utility module
//

const fs = require("fs")
const fetch = require("node-fetch")
const path = require("path")

const {
  NODE_ENV,
  MAINNET_ALCHEMY_URL,
  RINKEBY_ALCHEMY_URL,
  GOERLI_ALCHEMY_URL,
  POLYGON_ALCHEMY_URL,
  MUMBAI_ALCHEMY_URL,
  PINATA_PRODUCTION_IPFS_URL_PREFIX,
  PINATA_DEVELOPMENT_IPFS_URL_PREFIX,
  ETHERSCAN_API_TOKEN,
  VERIFY_HOST_URL,
  VERIFY_HOST_URL_DEV
} = process.env

// =============================================================
// Constants or like constants
// =============================================================

const ISSUANCE_DATE = new Date("2022-09-29T00:00:00Z")

// max batch size when bulk mint and transfer
const MAX_BATCH_SIZE = 5

const isProduction = () => {
  return NODE_ENV === "mainnet" || NODE_ENV === "production" || NODE_ENV === "polygon"
}

const getAlchemyUrl = () => {
  switch (NODE_ENV) {
    case "production":
    case "mainnet":
      return MAINNET_ALCHEMY_URL
    case "rinkeby":
      return RINKEBY_ALCHEMY_URL
    case "goerli":
      return GOERLI_ALCHEMY_URL
    case "polygon":
      return POLYGON_ALCHEMY_URL
    case "polygonMumbai":
      return MUMBAI_ALCHEMY_URL
    default:
      return RINKEBY_ALCHEMY_URL
  }
}

const getGasStationUrl = () => {
  const ethMainnetEndpoint = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_TOKEN}`
  switch (NODE_ENV) {
    case "production":
    case "mainnet":
      return ethMainnetEndpoint
    case "rinkeby":
      // There is no gas tracker support on this testnet.
      // refs: https://docs.etherscan.io/v/rinkeby-etherscan
      return ethMainnetEndpoint
    case "goerli":
      // There is no gas tracker support on this testnet.
      // refs: https://docs.etherscan.io/v/goerli-etherscan/
      return ethMainnetEndpoint
    case "polygon":
      return "https://gasstation-mainnet.matic.network/v2"
    case "polygonMumbai":
      return "https://gasstation-mumbai.matic.today/v2"
    default:
      return ethMainnetEndpoint
  }
}

const fetchGasFee = async () => {
  const res = await (await fetch(getGasStationUrl())).json()

  // case of Polygon chain:
  switch (NODE_ENV) {
    case "polygon":
    case "polygonMumbai":
      return {
        maxPriorityFee: res.fast.maxPriorityFee,
        maxFee: res.fast.maxFee,
      }
  }

  // case of Ethereum chain:
  return {
    maxPriorityFee: parseFloat(res.result.ProposeGasPrice),
    maxFee: parseFloat(res.result.FastGasPrice),
  }
}

const getTokenSymbolFromEnv = () => {
  switch (NODE_ENV) {
    case "polygon":
    case "polygonMumbai":
      return "MATIC"
  }
  return "ETH"
}

const getTokenName = () => {
  return "XXX Credentials v1.0"
}

const getTokenSymbol = () => {
  return "XXX Credentials"
}

const getTokenDescription = () => {
  return "XXX Credentials is a platform for NFT delivery of certificates of completion and diplomas for special courses offered by XXXXX XXXXXXXXX of XXXXXXXXXX. It is distributed to those who have passed the course or graduated from the undergraduate or graduate program."
}

const getTokenJapaneseDescription = () => {
  return "XXX Credentialsは、XXXXXXの開講する特別な講座、コースに対する受講修了証明書、卒業の証となる学位記などをNFTで配信するプラットフォームです。講座の合格者や本学の学部卒業生・大学院修了生に対して配信されます。"
}

const getOpenSeaDescription = () => {
  return `${getTokenDescription()} (IN JAPANESE) ${getTokenJapaneseDescription()}`
}

const getIpfsUrl = (ipfsHash) => {
  let baseUrl = isProduction()
    ? PINATA_PRODUCTION_IPFS_URL_PREFIX
    : PINATA_DEVELOPMENT_IPFS_URL_PREFIX
  if (!baseUrl) {
    baseUrl = "https://gateway.pinata.cloud/ipfs/"
  }
  return `${baseUrl}${ipfsHash}`
}

const getVerifyUrl = (ipfsHash) => {
  const host = isProduction()
    ? VERIFY_HOST_URL
    : VERIFY_HOST_URL_DEV
  return `${host}/certificate/${ipfsHash}`
}

// =============================================================
//  Utilitiy functions
// =============================================================

function dateFormat(date = new Date(), separator = "/") {
  const yyyy = date.getFullYear()
  const mm = ("00" + (date.getMonth() + 1)).slice(-2)
  const dd = ("00" + date.getDate()).slice(-2)
  return [yyyy, mm, dd].join(separator)
}

function getIssuanceDateFormat() {
  return dateFormat(ISSUANCE_DATE)
}

function logWithTime(msg, logPrefix = null) {
  logMsg = logPrefix ? `${logPrefix} ${msg}` : msg
  const now = new Date()
  console.log(
    `[${now.toLocaleString()}.${("000" + now.getMilliseconds()).slice(
      -3
    )}] ${logMsg}`
  )
}

const encodeBase64FromImage = (imageFilepath, mimeImageType = "png") => {
  const content = fs.readFileSync(imageFilepath)
  return `data:image/${mimeImageType};base64,${content.toString("base64")}`
}

const cleanupOutputDir = (dirpath, targetExtension = ".json") => {
  return new Promise((resolve, reject) => {
    fs.readdir(dirpath, (err, files) => {
      if (err) {
        reject(err)
        return
      }

      const jsonFiles = files.filter((filename) => {
        const filePath = path.join(dirpath, filename)
        return (
          fs.statSync(filePath).isFile() && filename.endsWith(targetExtension)
        )
      })

      const deleteFiles = []
      for (const filename of jsonFiles) {
        const filePath = path.join(dirpath, filename)
        fs.unlinkSync(filePath)
        deleteFiles.push(filePath)
      }
      resolve(deleteFiles)
    })
  })
}

/**
 * create a mint batch set from members
 *
 * test file: tests/scripts/utils-test.js
 */
function createMintBatches({
  members,
  batchSize = MAX_BATCH_SIZE,
  groupField = "credential_id",
}) {
  /**
   * e.g.
   *   > const array1 = [1,2,3,4,5,6]
   *   > splitAtEqualNum(array1, 2)
   *   => [ [ 1, 2 ], [ 3, 4 ], [ 5, 6 ] ]
   *
   *   > splitAtEqualNum(array1, 4)
   *   => [ [ 1, 2, 3, 4 ], [ 5, 6 ] ]
   */
  function splitAtEqualNum([...array], size = 1) {
    return array.reduce(
      (pre, _current, index) =>
        index % size ? pre : [...pre, array.slice(index, index + size)],
      []
    )
  }

  const itemsGroupByKey = {}
  for (const member of members) {
    const key = member[groupField]
    if (!(key in itemsGroupByKey)) {
      itemsGroupByKey[key] = []
    }
    itemsGroupByKey[key].push(member)
  }

  let batches = []
  for (const key in itemsGroupByKey) {
    for (const batch of splitAtEqualNum(itemsGroupByKey[key], batchSize)) {
      batches.push(batch)
    }
  }
  return batches
}

module.exports = {
  ISSUANCE_DATE,
  MAX_BATCH_SIZE,
  isProduction,
  getAlchemyUrl,
  getGasStationUrl,
  fetchGasFee,
  getTokenSymbolFromEnv,
  getTokenName,
  getTokenSymbol,
  getTokenDescription,
  getTokenJapaneseDescription,
  getOpenSeaDescription,
  getIpfsUrl,
  getVerifyUrl,
  getIssuanceDateFormat,
  logWithTime,
  cleanupOutputDir,
  encodeBase64FromImage,
  createMintBatches,
}
