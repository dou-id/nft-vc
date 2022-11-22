require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("dotenv").config()

// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  defaultNetwork: "goerli",
  networks: {
    goerli: {
      url: process.env.GOERLI_ALCHEMY_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    mainnet: {
      url: process.env.MAINNET_ALCHEMY_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    polygonMumbai: {
      url: process.env.MUMBAI_ALCHEMY_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    polygon: {
      url: process.env.POLYGON_ALCHEMY_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_TOKEN,
      mainnet: process.env.ETHERSCAN_API_TOKEN,
      polygonMumbai: process.env.POLYGONSCAN_API_TOKEN,
      polygon: process.env.POLYGONSCAN_API_TOKEN,
    },
  },
  paths: {
    tests: "./tests/contracts",
  },
  mocha: {
    timeout: 1000 * 60 * 3, // 3min
  },
}
