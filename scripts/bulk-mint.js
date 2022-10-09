//
// bulk mint from members.json
//
// (DRY RUN)
// node scripts/bulk-mint.js ./tmp/members.json
// (本実行)
// node scripts/bulk-mint.js ./tmp/members.json --dry-run=false
//

const { NODE_ENV, CONTRACT_ADDRESS, PUBLIC_KEY, PRIVATE_KEY } = process.env

const fs = require("fs")
const { createAlchemyWeb3 } = require("@alch/alchemy-web3")

const {
  getAlchemyUrl,
  fetchGasFee,
  getOpenSeaDescription,
  getTokenSymbolFromEnv,
  getIpfsUrl,
  getVerifyUrl,
  logWithTime,
  createMintBatches,
} = require("./utils")

const web3 = createAlchemyWeb3(getAlchemyUrl())
const contract = require("../artifacts/contracts/NFTCredential.sol/NFTCredential.json")
const nftContract = new web3.eth.Contract(contract.abi, CONTRACT_ADDRESS)

const TOKEN_SYMBOL = getTokenSymbolFromEnv()
const TOKEN_DESCRIPTION = getOpenSeaDescription()
const ARGV_ERR_MSG = `[ARGV ERROR] The argv are something wrong.\nExpected cmd is below:\n  \$ node scripts/bulk-mint.js <INPUT_JSON_FILE> (--dry-run=true|false)`

function toHexFromGwei(gwei) {
  return web3.utils.toHex(web3.utils.toWei(gwei.toFixed(9), "gwei"))
}

function toEtherFromGasAndFee(gas, feeGwei) {
  return web3.utils.fromWei(
    web3.utils.toWei((gas * feeGwei).toFixed(9), "gwei")
  )
}

/**
 * execute Contract#mintAndTrasfer
 */
async function mintAndTrasfer(batchMembers, dryrun = true, logPrefix = null) {
  let estimatedGas = 0
  let maxFee = 0
  try {
    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest")

    // setup the args of Contract.mintAndTransfer
    const credentialId = batchMembers[0].credential_id
    const addresses = batchMembers.map((member) => member.holder_wallet_address)
    const imageURIs = batchMembers.map((member) =>
      getIpfsUrl(member.nft_image_ipfs_hash)
    )
    const externalURIs = batchMembers.map((member) =>
      getVerifyUrl(member.vc_ipfs_hash)
    )
    const txData = nftContract.methods
      .mintAndTransfer(
        credentialId,
        TOKEN_DESCRIPTION,
        addresses,
        imageURIs,
        externalURIs
      )
      .encodeABI()

    const estimatedGas = await web3.eth.estimateGas({
      from: PUBLIC_KEY,
      to: CONTRACT_ADDRESS,
      nonce,
      data: txData,
    })
    const gasFee = await fetchGasFee()
    maxFee = gasFee.maxFee
    const maxPriorityFee = gasFee.maxPriorityFee

    const signedTx = await web3.eth.accounts.signTransaction(
      {
        from: PUBLIC_KEY,
        to: CONTRACT_ADDRESS,
        nonce,
        data: txData,
        gas: estimatedGas,
        maxFeePerGas: toHexFromGwei(maxFee),
        maxPriorityFeePerGas: toHexFromGwei(maxPriorityFee),
      },
      PRIVATE_KEY
    )
    logWithTime(
      `trying to send transaction: ${signedTx.transactionHash}`,
      logPrefix
    )
    logWithTime(
      `nonce=${nonce}, estimateGas=${estimatedGas}(Gas), maxPriorityFeePerGas=${maxPriorityFee}(Gwei), maxFeePerGas=${maxFee}(Gwei)`,
      logPrefix
    )
    let transactionReceipt
    if (dryrun) {
      transactionReceipt = { transactionHash: "DRY_RUN_MODE" }
    } else {
      transactionReceipt = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      )
    }
    return [true, transactionReceipt, estimatedGas, maxFee]
  } catch (e) {
    return [false, e, estimatedGas, maxFee]
  }
}

async function main() {
  let dryrun = true
  switch (process.argv.length) {
    case 3:
      break
    case 4:
      option = process.argv[3]
      if (!["--dry-run=true", "--dry-run=false"].includes(option)) {
        throw ARGV_ERR_MSG
      } else if (option === "--dry-run=false") {
        dryrun = false
      }
      break
    default:
      throw ARGV_ERR_MSG
  }
  logWithTime(
    `START dry-run=${dryrun}, NODE_ENV=${NODE_ENV}, CONTRACT=${CONTRACT_ADDRESS}`
  )

  const ok = []
  const ng = []
  let totalGasEstimated = 0
  let totalGwei = 0
  let totalGasUsed = 0
  const beforeBalanceWei = await web3.eth.getBalance(PUBLIC_KEY)

  const members = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
  const mintBatches = createMintBatches({ members })
  const totalBatch = mintBatches.length
  let batchIndex = 0

  console.log(`\n----- Log -----`)
  for (const batchMembers of mintBatches) {
    logPrefix = `${("000" + (batchIndex + 1)).slice(-3)}/${(
      "000" + totalBatch
    ).slice(-3)}`
    const [isSucceeded, result, gasEstimated, maxFeePerGas] =
      await mintAndTrasfer(batchMembers, dryrun, logPrefix)

    let gasUsed = 0
    if (isSucceeded) {
      if (result.gasUsed) {
        gasUsed = result.gasUsed
      }
      logWithTime(
        `[SUCCESS] batchIndex=${batchIndex}, gasUsed=${gasUsed}(Gas), estimatedCost=${toEtherFromGasAndFee(
          gasEstimated,
          maxFeePerGas
        )}(${TOKEN_SYMBOL})`,
        logPrefix
      )
      ok.push(batchIndex)
    } else {
      if (result.receipt && result.receipt.gasUsed) {
        gasUsed = result.receipt.gasUsed
      }
      logWithTime(
        `[ERROR]   batchIndex=${batchIndex}, gasUsed=${gasUsed}(Gas), estimatedCost=${toEtherFromGasAndFee(
          gasEstimated,
          maxFeePerGas
        )}(${TOKEN_SYMBOL})`,
        logPrefix
      )
      console.error(result)
      ng.push(batchIndex)
    }

    totalGasEstimated += gasEstimated
    totalGwei += gasEstimated * maxFeePerGas
    totalGasUsed += gasUsed
    batchIndex += 1
  }

  if (dryrun) {
    const totalWei = web3.utils.toWei(totalGwei.toFixed(9), "gwei")
    console.log(`\n----- Check Balance -----`)
    console.log(
      `Is your balance enough?: ${BigInt(beforeBalanceWei) > BigInt(totalWei)}`
    )
    console.log(
      `Before Balance : ${web3.utils.fromWei(
        beforeBalanceWei
      )}(${TOKEN_SYMBOL})`
    )
    console.log(
      `Estimated Ether: ${toEtherFromGasAndFee(totalGwei, 1)}(${TOKEN_SYMBOL})`
    )
    console.log(`GasEstimated   : ${totalGasEstimated}(Gas)`)
  }

  return [ok, ng, totalGasUsed, totalGasEstimated]
}

main()
  .then((result) => {
    const [ok, ng, gasUsed, estimatedGas] = result
    console.log(`\n----- Results -----`)
    console.log(`TOTAL: ${ok.length + ng.length}(Batches)`)
    console.log(`OK   : ${ok.length}(Batches)`)
    console.log(`NG   : ${ng.length}(Batches)`)
    console.log(`GasUsed     : ${gasUsed}(Gas)`)
    console.log(`EstimatedGas: ${estimatedGas}(Gas)`)

    console.log(`\n----- Effected Wallet Addresses -----`)
    console.log(`OK Batch Indexes(${ok.length}): ${JSON.stringify(ok)}`)
    console.log(`NG Batch Indexes(${ng.length}): ${JSON.stringify(ng)}`)
    console.log()
    logWithTime("END")

    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
