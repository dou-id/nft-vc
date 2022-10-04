const assert = require("chai").assert
const utils = require("./../../scripts/utils")

describe("utils.createMintBatches", function () {
  const item1 = {
    vc_id: "VC001",
    credential_id: "C001",
    holder_id: "H001",
  }
  const item2 = {
    vc_id: "VC002",
    credential_id: "C001",
    holder_id: "H002",
  }
  const item3 = {
    vc_id: "VC003",
    credential_id: "C001",
    holder_id: "H003",
  }
  const item4 = {
    vc_id: "VC004",
    credential_id: "C001",
    holder_id: "H004",
  }
  const item5 = {
    vc_id: "VC005",
    credential_id: "C002",
    holder_id: "H001",
  }
  const item6 = {
    vc_id: "VC006",
    credential_id: "C002",
    holder_id: "H005",
  }
  const item7 = {
    vc_id: "VC007",
    credential_id: "C002",
    holder_id: "H006",
  }
  const item8 = {
    vc_id: "VC008",
    credential_id: "C003",
    holder_id: "H001",
  }
  const members1 = [item1, item2, item3, item4, item5, item6, item7, item8]
  it("batchSize=1", function () {
    const actual = utils.createMintBatches({ members: members1, batchSize: 1 })
    assert.equal(actual.length, 8)
    assert.sameMembers(actual[0], [item1])
    assert.sameMembers(actual[1], [item2])
    assert.sameMembers(actual[2], [item3])
    assert.sameMembers(actual[3], [item4])
    assert.sameMembers(actual[4], [item5])
    assert.sameMembers(actual[5], [item6])
    assert.sameMembers(actual[6], [item7])
    assert.sameMembers(actual[7], [item8])
  })

  it("batchSize=3", function () {
    const actual = utils.createMintBatches({ members: members1, batchSize: 3 })
    assert.equal(actual.length, 4)
    assert.sameMembers(actual[0], [item1, item2, item3])
    assert.sameMembers(actual[1], [item4])
    assert.sameMembers(actual[2], [item5, item6, item7])
    assert.sameMembers(actual[3], [item8])
  })

  it("batchSize=10", function () {
    const actual = utils.createMintBatches({
      members: members1,
      batchSize: 10,
    })
    assert.equal(actual.length, 3)
    assert.sameMembers(actual[0], [item1, item2, item3, item4])
    assert.sameMembers(actual[1], [item5, item6, item7])
    assert.sameMembers(actual[2], [item8])
  })

  it(`default batchSize=${utils.MAX_BATCH_SIZE}`, function () {
    const actual = utils.createMintBatches({
      members: members1,
    })
    assert.equal(actual.length, 3)
    assert.sameMembers(actual[0], [item1, item2, item3, item4])
    assert.sameMembers(actual[1], [item5, item6, item7])
    assert.sameMembers(actual[2], [item8])
  })

  it("batchSize=3 and groupField=holder_id", function () {
    const actual = utils.createMintBatches({
      members: members1,
      batchSize: 3,
      groupField: "holder_id",
    })
    assert.equal(actual.length, 6)
    assert.sameMembers(actual[0], [item1, item5, item8])
    assert.sameMembers(actual[1], [item2])
    assert.sameMembers(actual[2], [item3])
    assert.sameMembers(actual[3], [item4])
    assert.sameMembers(actual[4], [item6])
    assert.sameMembers(actual[5], [item7])
  })
})
