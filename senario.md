# シナリオ
- 一郎さん、二郎さん、三郎さんの3名が、
講義の単位を取得し証明書をVC付きのNFTとして受け取ります。
- NFTをopensea上で参照し、blockcertsを用いて検証を行います。

# 事前準備
- did.json / blockcertsのIssuerProfileは公開済み
  - [did.json](https://did.staging.sakazuki.xyz/.well-known/did.json)
  - [blockcerts.json](https://did.staging.sakazuki.xyz/blockcerts.json)

- 証明書画像 / NFT画像については、事前に作成済み
  - 証明書画像: ./output/vc_images
  - NFT画像: ./output/nft_images

- NFTのmint用のコントラクトは事前にアップロード済み

上記が出来ている状態から、VCの作成と
NFTの発行・発行物の確認までを実施します。

# VC(Verifiable Credentials)の発行
1.署名なしのVCの作成
```
# 入力情報の確認（事前生成）
cat ./tmp/members.json | jq
# VCの作成
node scripts/generate-unsigned-vc.js ./tmp/members.json
```

2.VC発行をします
```
cert-issuer -c cert-issuer.dev.ini --chain ethereum_ropsten --ropsten_rpc_url $ROPSTEN_INFURA_URL
```

3.IPFSにアップロードする
```
node scripts/bulk-upload-to-ipfs.js ./tmp/members.json vc
# アップロードhashの確認
cat ./tmp/members.json | jq
```
* https://gateway.pinata.cloud/ipfs/XXXX

# NFTの発行
1.NFT画像をIPFSにアップロードする
```
# NFT画像の確認
open ./output/nft_images/
# アップロード処理
node scripts/bulk-upload-to-ipfs.js ./tmp/members.json nft
# アップロードした内容の確認
cat ./tmp/members.json | jq
```
2.NFT の mint
アップロードしたNFTを対象者へ送る
```
# dry run
node scripts/bulk-mint.js ./tmp/members.json
# 本実施
node scripts/bulk-mint.js ./tmp/members.json --dry-run=false
```
3.openseaで確認を実施
https://testnets.opensea.io/ja/assets/goerli/0xdd9d3bd00f4617a4425f55d32ec41c7dbd82f8c2/15
*VCの確認。Blockcertsでの検証結果確認