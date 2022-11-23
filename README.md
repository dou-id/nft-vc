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

1. issuer の情報を did:web メソッドで resolve できるようにする。

- Ethereum の秘密鍵を指定して JWK 形式の公開鍵に変換する

```sh
$ node scripts/convert-did-public-key.js ./keys/wallet-private.dev.key
{"kty":"EC","crv":"K-256","x":"XyZpmS5rwy23Dqm3iYNGn_A_p5JYXOSbyp_ev1Uss7E","y":"XyZvZO81bLTeH0-XmjQlrhAWOC79utg3aC5BV5amAsI"}
```

- `./keys/wallet-private.dev.key` に秘密鍵を配置して下さい

2. did.json を作成する (上記の公開鍵情報を含める)

- 参考: `hostings/staging/public/.well-known/did.json`

3. IssuerProfile ファイルを作成する

- 参考: `hostings/staging/public/blockcerts.json`

4. RevocationList ファイルを作成する

- 参考: `hostings/staging/public/blockcerts_revocation_list.json`

5. 手順 2,3,4 で作成したファイルをホスティングする。

- 参考: `hostings/staging/README.md`

## 証明書発行ワークフロー

### VC 発行フロー

1. GoogleForm から JSON に変換

```sh
$ node scripts/convert-members.js ./tmp/form.csv > ./tmp/members.json
```

2. VC 用の画像生成

```sh
$ node scripts/generate-vc-image.js ./tmp/members.json
```

3. 署名なし VC を生成

```sh
$ node scripts/generate-unsigned-vc.js ./tmp/members.json
```

4. VC 発行

```sh
# dev (goerli)
$ cert-issuer -c cert-issuer.dev.ini --chain ethereum_goerli --goerli_rpc_url $GOERLI_ALCHEMY_URL

# prd (mainnet)
$ cert-issuer -c cert-issuer.prd.ini --chain ethereum_mainnet --ethereum_rpc_url $MAINNET_ALCHEMY_URL
```

5. 発行済み VC を IPFS にアップロード

```sh
$ node scripts/bulk-upload-to-ipfs.js ./tmp/members.json vc
```

### NFT 発行フロー

1. NFT 用の画像生成

```sh
$ node scripts/generate-nft-image.js ./tmp/members.json
```

2. NFT 用の画像を IPFS にアップロード

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
※ エラー発生時でも verify に成功しているケースを確認しているため、etherscan で CONTRACT_ADDRESS を検索するとヒント見つかるかも。

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

※ 一部の Utility 関数のみテスト定義している

### Test for Smart Contract

local でノードを起動

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
$ npx hardhat test --network goerli
```

※ ガス代結構かかるので注意。
※ 一部ケースは NG になる `ethers.getSigners()` で 3 アカウント分のセットアップが必要なため。
