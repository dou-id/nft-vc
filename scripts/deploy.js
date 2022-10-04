//
// deploys NFTCredential contract.
//
// How to use:
// $ npx hardhat run scripts/deploy.js --network rinkeby|goerli|mainnet
//

const hre = require("hardhat")
const { MAX_BATCH_SIZE, getTokenName, getTokenSymbol } = require("./utils")

const main = async () => {
  const contractFactory = await hre.ethers.getContractFactory("NFTCredential")
  const contract = await contractFactory.deploy(getTokenName(), getTokenSymbol(), MAX_BATCH_SIZE)
  await contract.deployed()
  console.log("deployed to:", contract.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
