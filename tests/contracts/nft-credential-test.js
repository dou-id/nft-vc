const { expect } = require("chai")
const crypto = require("crypto")
const { ethers } = require("hardhat")
const {
  MAX_BATCH_SIZE,
  getOpenSeaDescription,
} = require("./../../scripts/utils")

const SUBJECT_CONTRACT_NAME = "NFTCredential"
const DEFAULT_TOKEN_NAME = "TOKEN_NAME1"
const DEFAULT_TOKEN_SYMBOL = "TEST1"
const DEFAULT_MAX_BATCH_SIZE = 2
const DEFAULT_CREDENTIAL_ID = "CRED_001"
const DEFAULT_TOKEN_DESCRIPTION = getOpenSeaDescription()

// 本番相当データ量でのガス使用量を見積もるケースの実行有無
const ENABLE_LARGE_MINTIING_CASES = false

describe("NFTCredential", function () {
  let contract
  let owner, alice, bob
  let dummyAddresses
  let assertionError
  const cred1 = "CRED_201"
  const cred2 = "CRED_202"

  beforeEach(async function () {
    assertionError = false
    contract = await initializeContract({})
    ;[owner, alice, bob] = await ethers.getSigners()
    dummyAddresses = generateWalletAddresses()
  })

  describe("constructor", function () {
    it(`can set the name and the symbol`, async function () {
      expect(await contract.name()).to.be.equal(DEFAULT_TOKEN_NAME)
      expect(await contract.symbol()).to.be.equal(DEFAULT_TOKEN_SYMBOL)
      expect(await contract.symbol()).to.be.equal(DEFAULT_TOKEN_SYMBOL)

      contract2 = await initializeContract({
        tokenName: "TOKEN_NAME2",
        tokenSymbol: "TEST2",
      })
      expect(await contract2.name()).to.be.equal("TOKEN_NAME2")
      expect(await contract2.symbol()).to.be.equal("TEST2")
    })
  })

  describe("mintAndTransfer", function () {
    it(`can batch mint and transfer and call ownedCredential`, async function () {
      await mintAndTransfer({
        contract,
        account: owner,
        quantity: DEFAULT_MAX_BATCH_SIZE,
      })

      // can call ownedCredential
      const credentialId = await ownedCredential({
        contract,
        account: owner,
        tokenId: 0,
      })
      expect(credentialId).to.be.equal(DEFAULT_CREDENTIAL_ID)
    })
    it(`can batch mint MAX_BATCH_SIZE(${MAX_BATCH_SIZE}) tokens`, async function () {
      const quantity = MAX_BATCH_SIZE
      await setMaxBatchSize({
        contract,
        account: owner,
        newMaxBatchSize: quantity,
      })
      await mintAndTransfer({
        contract,
        account: owner,
        quantity,
      })
    })
    it(`Non-owner cannot batch mint`, async function () {
      try {
        await mintAndTransfer({
          contract,
          account: alice,
          quantity: DEFAULT_MAX_BATCH_SIZE,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(`Ownable: caller is not the owner`)
      } finally {
        expect(assertionError).to.be.true
      }
    })
    it(`cannot mint in the case of addresses empty`, async function () {
      try {
        await mintAndTransfer({
          contract,
          account: owner,
          quantity: DEFAULT_MAX_BATCH_SIZE,
          toAddresses: [],
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(`The _toAddresses is empty.`)
      } finally {
        expect(assertionError).to.be.true
      }
    })
    it(`cannot mint more than maxBatchSize`, async function () {
      try {
        await mintAndTransfer({
          contract,
          account: owner,
          quantity: DEFAULT_MAX_BATCH_SIZE + 1,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(
          `The length of _toAddresses must be less than or equal to _maxBatchSize.`
        )
      } finally {
        expect(assertionError).to.be.true
      }
    })
    it(`cannot mint in the case of the different length of toAddresses and imageURIs`, async function () {
      try {
        await mintAndTransfer({
          contract,
          account: owner,
          quantity: 1,
          toAddresses: dummyAddresses.slice(0, 2),
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(
          `The length of _toAddresses and _imageURIs are NOT same.`
        )
      } finally {
        expect(assertionError).to.be.true
      }
    })
    it(`can/cannot mint to same user in diffrent credentials`, async function () {
      const toAddresses = dummyAddresses.slice(0, DEFAULT_MAX_BATCH_SIZE)

      // mint of cred1
      await mintAndTransfer({
        contract,
        account: owner,
        quantity: DEFAULT_MAX_BATCH_SIZE,
        credentialId: cred1,
        toAddresses,
      })
      let contractCred1 = await ownedCredential({
        contract,
        account: owner,
        tokenId: 0,
      })
      expect(contractCred1).to.be.equal(cred1)

      // mint of cred2
      await mintAndTransfer({
        contract,
        account: owner,
        quantity: DEFAULT_MAX_BATCH_SIZE,
        credentialId: cred2,
        toAddresses,
      })
      let contractCred2 = await ownedCredential({
        contract,
        account: owner,
        tokenId: DEFAULT_MAX_BATCH_SIZE,
      })
      expect(contractCred2).to.be.equal(cred2)

      // mint to the same address of cred1
      // assert that cannot mint to a user who has the same credential already.
      try {
        await mintAndTransfer({
          contract,
          account: owner,
          quantity: 1,
          credentialId: cred1,
          toAddresses: [toAddresses[0]],
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(`One or more recipient`)
      } finally {
        expect(assertionError).to.be.true
      }
    })
    it(`cannot mint to owner address`, async function () {
      const toAddresses = [owner.address]
      try {
        await mintAndTransfer({
          contract,
          account: owner,
          quantity: 1,
          toAddresses,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(
          `_toAddresses must NOT be included OWNER.`
        )
      } finally {
        expect(assertionError).to.be.true
      }
    })
  })

  describe("getMaxBatchSize and setMaxBatchSize", function () {
    it(`can change maxBatchSize`, async function () {
      const beforeChange = await getMaxBatchSize({ contract, account: owner })
      expect(beforeChange).to.be.equal(DEFAULT_MAX_BATCH_SIZE)
      const newValue = 3
      await setMaxBatchSize({
        contract,
        account: owner,
        newMaxBatchSize: newValue,
      })
      const afterChange = await getMaxBatchSize({ contract, account: owner })
      expect(afterChange).to.be.equal(newValue)
    })
  })

  describe("safeTransferFrom and transferFrom", function () {
    let steve, john

    beforeEach(async function () {
      ;[steve, john] = dummyAddresses
      const toAddresses = [alice.address, steve]

      // mint
      await mintAndTransfer({
        contract,
        account: owner,
        quantity: toAddresses.length,
        toAddresses: toAddresses,
      })
      expect(await contract.ownerOf(0)).to.be.equal(alice.address)
      expect(await contract.ownerOf(1)).to.be.equal(steve)

      // Alice delegates any transfer privilege to the owner
      await setApprovalForAll({
        contract,
        account: alice,
        operator: owner.address,
      })
    })
    it(`can transfer to new user by safeTransferFrom`, async function () {
      // transfer to a new user from alice
      await safeTransferFrom({
        contract,
        account: owner,
        from: alice.address,
        to: john,
        tokenId: 0,
      })
      expect(await contract.ownerOf(0)).to.be.equal(john)
    })
    it(`Non-owner cannot transfer by safeTransferFrom`, async function () {
      try {
        await safeTransferFrom({
          contract,
          account: bob,
          from: alice.address,
          to: john,
          tokenId: 0,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(`Ownable: caller is not the owner`)
      } finally {
        expect(assertionError).to.be.true
      }
    })
    it(`can transfer to new user by transferFrom`, async function () {
      // transfer to a new user from alice
      await transferFrom({
        contract,
        account: owner,
        from: alice.address,
        to: john,
        tokenId: 0,
      })
      expect(await contract.ownerOf(0)).to.be.equal(john)
    })
    it(`Non-owner cannot transfer by transferFrom`, async function () {
      try {
        await transferFrom({
          contract,
          account: bob,
          from: alice.address,
          to: john,
          tokenId: 0,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(`Ownable: caller is not the owner`)
      } finally {
        expect(assertionError).to.be.true
      }
    })
    it(`cannot transfer in the case of an invalid token ID`, async function () {
      try {
        await transferFrom({
          contract,
          account: owner,
          from: alice.address,
          to: john,
          tokenId: 1,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(
          `The from-address is NOT the token ID's owner.`
        )
      } finally {
        expect(assertionError).to.be.true
      }
    })
    it(`cannot transfer to a holder who has already the same credential`, async function () {
      try {
        await transferFrom({
          contract,
          account: owner,
          from: alice.address,
          to: steve,
          tokenId: 0,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(
          `The to-address has the same credential already.`
        )
      } finally {
        expect(assertionError).to.be.true
      }
    })
  })

  describe("updateNFT", function () {
    const newImageURI = "https://pitpa.jp/images/0"
    const newExternalURI = "https://pitpa.jp/externals/0"
    let beforeTokenURI
    beforeEach(async function () {
      ;[steve] = dummyAddresses
      const toAddresses = [steve]
      // mint
      await mintAndTransfer({
        contract,
        account: owner,
        quantity: toAddresses.length,
        credentialId: cred1,
        toAddresses,
      })
      expect(await contract.ownerOf(0)).to.be.equal(steve)
      beforeTokenURI = await contract.tokenURI(0)
    })
    it(`can updaet NFT with NO credential ID change`, async function () {
      await updateNFT({
        contract,
        account: owner,
        tokenId: 0,
        credentialId: cred1,
        imageURI: newImageURI,
        externalURI: newExternalURI,
      })
      const credentialId = await ownedCredential({
        contract,
        account: owner,
        tokenId: 0,
      })
      expect(credentialId).to.be.equal(cred1)
      expect(await contract.tokenURI(0)).not.to.be.equal(beforeTokenURI)
    })
    it(`can updaet NFT with description change`, async function () {
      await updateNFT({
        contract,
        account: owner,
        tokenId: 0,
        credentialId: cred1, // NO CHANGE
        description: "NEW DESCRIPTION",
        imageURI: generateDummyImageUrls(1)[0], // NO CHANGE
        externalURI: generateDummyExternalUrls(1)[0], // NO CHANGE
      })
      const credentialId = await ownedCredential({
        contract,
        account: owner,
        tokenId: 0,
      })
      expect(credentialId).to.be.equal(cred1)
      expect(await contract.tokenURI(0)).not.to.be.equal(beforeTokenURI)
    })
    it(`can updaet NFT with a credential ID change`, async function () {
      await updateNFT({
        contract,
        account: owner,
        tokenId: 0,
        credentialId: cred2,
        imageURI: newImageURI,
        externalURI: newExternalURI,
      })
      const credentialId = await ownedCredential({
        contract,
        account: owner,
        tokenId: 0,
      })
      expect(credentialId).to.be.equal(cred2)
      expect(await contract.tokenURI(0)).not.to.be.equal(beforeTokenURI)
    })
    it(`No-owner cannot update NFT`, async function () {
      try {
        await updateNFT({
          contract,
          account: alice,
          tokenId: 0,
          credentialId: cred1,
          imageURI: newImageURI,
          externalURI: newExternalURI,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(`Ownable: caller is not the owner`)
      } finally {
        expect(assertionError).to.be.true
      }
    })
  })

  describe("transferOwnership", function () {
    it(`can transfer`, async function () {
      await transferOwnership({
        contract,
        account: owner,
        newOwner: alice.address,
      })
    })
    it(`Non-owner cannot transfer`, async function () {
      try {
        await transferOwnership({
          contract,
          account: alice,
          newOwner: bob.address,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(`Ownable: caller is not the owner`)
      } finally {
        expect(assertionError).to.be.true
      }
    })
    it(`cannot transfer to a holder who has this token`, async function () {
      await mintAndTransfer({
        contract,
        account: owner,
        quantity: 1,
        toAddresses: [bob.address],
      })
      try {
        await transferOwnership({
          contract,
          account: owner,
          newOwner: bob.address,
        })
      } catch (err) {
        assertionError = true
        expect(err.reason).to.include(`newOwner's balance must be zero.`)
      } finally {
        expect(assertionError).to.be.true
      }
    })
  })

  describe("estimate the total gas in the condition of 400 Tokens", function () {
    const targeTokenNum = 400

    function splitAtEqualNum([...array], size = 1) {
      return array.reduce(
        (pre, _current, index) =>
          index % size ? pre : [...pre, array.slice(index, index + size)],
        []
      )
    }

    async function mintAll(batchSize) {
      if (!ENABLE_LARGE_MINTIING_CASES) {
        console.log("      => SKIP")
        return
      }
      // change BatchSize
      await setMaxBatchSize({
        contract,
        account: owner,
        newMaxBatchSize: batchSize,
      })

      // split addresses by batchSize and bulk mint sequentially
      let totalGasUsed = 0
      let targetAddresses = generateWalletAddresses(targeTokenNum)
      const batchItems = splitAtEqualNum(targetAddresses, batchSize)
      const batchNum = batchItems.length
      for (const batchAddresses of batchItems) {
        const receipt = await mintAndTransfer({
          contract,
          account: owner,
          quantity: batchAddresses.length,
          toAddresses: batchAddresses,
        })
        totalGasUsed += receipt.gasUsed.toNumber()
      }
      const gasUsedPerBatch = (totalGasUsed / batchNum).toFixed(0)
      const gasUsedPerToken = (totalGasUsed / targeTokenNum).toFixed(0)
      console.log(
        `BatchSize=${batchSize}, BatchNum=${batchNum}, TotalGas=${totalGasUsed}, GasPerBatch=${gasUsedPerBatch}, GasPerToken=${gasUsedPerToken}`
      )
    }

    it(`${targeTokenNum} mint cost with batchSize=1`, async function () {
      await mintAll(1)
    })

    it(`${targeTokenNum} mint cost with batchSize=5`, async function () {
      await mintAll(5)
    })

    it(`${targeTokenNum} mint cost with batchSize=10`, async function () {
      await mintAll(10)
    })

    it(`${targeTokenNum} mint cost with batchSize=20`, async function () {
      await mintAll(20)
    })

    it(`${targeTokenNum} mint cost with batchSize=MAX_BATCH_SIZE(${MAX_BATCH_SIZE})`, async function () {
      await mintAll(MAX_BATCH_SIZE)
    })
  })
})

const generateWallet = () => {
  const privateKey = `0x${crypto.randomBytes(32).toString("hex")}`
  const wallet = new ethers.Wallet(privateKey)
  return { privateKey, walletAddress: wallet.address }
}

const batchGenerateWallet = (num = 5) => {
  const wallets = []
  while (num > 0) {
    wallets.push(generateWallet())
    num--
  }
  return wallets
}

const generateWalletAddresses = (num = 5) => {
  return batchGenerateWallet(num).map((item) => item.walletAddress)
}

const generateDummyUrls = (num = 5, urlPath = "") => {
  const template = "https://example.com"
  const items = []
  let index = 0
  while (num > 0) {
    items.push(`${template}${urlPath}/${index}`)
    index++
    num--
  }
  return items
}

const generateDummyImageUrls = (num = 5) => {
  return generateDummyUrls(num, "/images")
}

const generateDummyExternalUrls = (num = 5) => {
  return generateDummyUrls(num, "/externals")
}

const initializeContract = async ({
  contractName = SUBJECT_CONTRACT_NAME,
  tokenName = DEFAULT_TOKEN_NAME,
  tokenSymbol = DEFAULT_TOKEN_SYMBOL,
  maxBatchSize = DEFAULT_MAX_BATCH_SIZE,
}) => {
  const nftCredential = await ethers.getContractFactory(contractName)
  return await nftCredential.deploy(tokenName, tokenSymbol, maxBatchSize)
}

const mintAndTransfer = async ({
  contract,
  account,
  quantity,
  credentialId = DEFAULT_CREDENTIAL_ID,
  description = DEFAULT_TOKEN_DESCRIPTION,
  toAddresses = null,
}) => {
  const mintTx = await contract
    .connect(account)
    .mintAndTransfer(
      credentialId,
      description,
      toAddresses || generateWalletAddresses(quantity),
      generateDummyImageUrls(quantity),
      generateDummyExternalUrls(quantity)
    )
  return await mintTx.wait()
}

const getMaxBatchSize = async ({ contract, account }) => {
  return await contract.connect(account).getMaxBatchSize()
}

const setMaxBatchSize = async ({ contract, account, newMaxBatchSize }) => {
  const tx = await contract.connect(account).setMaxBatchSize(newMaxBatchSize)
  return await tx.wait()
}

const ownedCredential = async ({ contract, account, tokenId }) => {
  return await contract.connect(account).ownedCredential(tokenId)
}

const safeTransferFrom = async ({ contract, account, from, to, tokenId }) => {
  const tx = await contract
    .connect(account)
    ["safeTransferFrom(address,address,uint256)"](from, to, tokenId)
  return await tx.wait()
}

const transferFrom = async ({ contract, account, from, to, tokenId }) => {
  const tx = await contract.connect(account).transferFrom(from, to, tokenId)
  return await tx.wait()
}

const setApprovalForAll = async ({
  contract,
  account,
  operator,
  approved = true,
}) => {
  const tx = await contract
    .connect(account)
    .setApprovalForAll(operator, approved)
  return await tx.wait()
}

const updateNFT = async ({
  contract,
  account,
  tokenId,
  credentialId,
  description = DEFAULT_TOKEN_DESCRIPTION,
  imageURI,
  externalURI,
}) => {
  const tx = await contract
    .connect(account)
    .updateNFT(tokenId, credentialId, description, imageURI, externalURI)
  return await tx.wait()
}

const transferOwnership = async ({ contract, account, newOwner }) => {
  const tx = await contract.connect(account).transferOwnership(newOwner)
  return await tx.wait()
}
