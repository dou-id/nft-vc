# nft-vc 

## Setup

- 検証時の環境
  - node: 16.13.0
  - Python: 3.9.13

### node.js

```sh
$ yarn
```

### Python (cert-issuer を利用可能にするため)

```sh
$ pyenv local 3.9.13
$ python -m venv venv
$ source venv/bin/activate
$ pip install --upgrade pip
$ pip install -r requirements.txt

# openssl 関連エラー発生時は以下で解決できたケースあり
$ env LDFLAGS="-L$(brew --prefix openssl)/lib" CFLAGS="-I$(brew --prefix openssl)/include" pip --no-cache-dir install -r requirements.txt

$ cert-issuer -h
```

## Issuer Setup

1. issuerの情報を did:web メソッドで resolve できるようにする。
  - Ethereumの秘密鍵を指定してJWK形式の公開鍵に変換する
```sh
$ node scripts/convert-did-public-key.js ./keys/wallet-private.dev.key
{"kty":"EC","crv":"K-256","x":"QgCpmS5rwy23Dqm3iYNGn_A_p5JYXOSbyp_ev1Uss7E","y":"lGIvZO81bLTeH0-XmjQlrhAWOC79utg3aC5BV5amAsI"}
```
* `./keys/wallet-private.dev.key` に秘密鍵を配置して下さい
2. did.json を作成する (上記の公開鍵情報を含める)
  - 参考: `hostings/staging/public/.well-known/did.json`
3. IssuerProfileファイルを作成する
  - 参考: `hostings/staging/public/blockcerts.json`
4. RevocationListファイルを作成する
  - 参考: `hostings/staging/public/blockcerts_revocation_list.json`
5. 手順2,3,4で作成したファイルをホスティングする。
  - 参考: `hostings/staging/README.md`

## 証明書発行ワークフロー

### VC発行フロー

1. GoogleFormからJSONに変換

```sh
$ node scripts/convert-members.js ./tmp/form.csv > ./tmp/members.json
```

2. VC用の画像生成

```sh
$ node scripts/generate-vc-image.js ./tmp/members.json
```

3. 署名なしVCを生成

```sh
$ node scripts/generate-unsigned-vc.js ./tmp/members.json
```

4. VC発行

```sh
# dev (ropsten)
$ cert-issuer -c cert-issuer.dev.ini --chain ethereum_ropsten --ropsten_rpc_url $ROPSTEN_INFURA_URL
# dev (goerli)
$ cert-issuer -c cert-issuer.dev.ini --chain ethereum_goerli --goerli_rpc_url $GOERLI_ALCHEMY_URL

# prd (mainnet)
$ cert-issuer -c cert-issuer.prd.ini --chain ethereum_mainnet --ethereum_rpc_url $MAINNET_ALCHEMY_URL
```

5. 発行済みVCをIPFSにアップロード

```sh
$ node scripts/bulk-upload-to-ipfs.js ./tmp/members.json vc
```

### NFT発行フロー

1. NFT用の画像生成

```sh
$ node scripts/generate-nft-image.js ./tmp/members.json
```

2. NFT用の画像をIPFSにアップロード

```sh
$ node scripts/bulk-upload-to-ipfs.js ./tmp/members.json nft
```

3. コントラクトのデプロイ

```sh
$ npx hardhat run scripts/deploy.js --network $NODE_ENV
Compiled 1 Solidity file successfully
deployed to: 0x1234567890123456789012345678901234567890
```

環境変数 `CONTRACT_ADDRESS` に上記のアドレスをセットします。

4. ソースコードのアップロード
```sh
$ npx hardhat verify $CONTRACT_ADDRESS --constructor-args arguments.js --network $NODE_ENV
```

※ エラー発生時に `$ npx hardhat clean` で解消するケースを確認している。
※ エラー発生時でも verifyに成功しているケースを確認しているため、etherscanでCONTRACT_ADDRESSを検索するとヒント見つかるかも。

5. NFT bulk mint

```sh
# dry-run
$ node scripts/bulk-mint.js ./tmp/members.json

# mint
$ node scripts/bulk-mint.js ./tmp/members.json --dry-run=false
```

## Test

### Test for scripts

```sh
$ npm test
```

※ 一部のUtility関数のみテスト定義している

### Test for Smart Contract

localでノードを起動
```sh
$ npx hardhat node
```

テスト実行
```sh
$ npm run test_contracts
# OR
$ npx hardhat test --network localhost
```

テストネット環境でテスト実行
```sh
$ npx hardhat test --network rinkeby|goerli
```
※ ガス代結構かかるので注意。
※ 一部ケースはNGになる `ethers.getSigners()` で 3アカウント分のセットアップが必要なため。
