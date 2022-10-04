// npx hardhat verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
const {
  MAX_BATCH_SIZE,
  getTokenName,
  getTokenSymbol,
} = require("./scripts/utils")

module.exports = [getTokenName(), getTokenSymbol(), MAX_BATCH_SIZE]
