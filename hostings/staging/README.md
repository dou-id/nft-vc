## 公開 URL
例では、https://did.staging.sakazuki.xyz 配下に public ディレクトリのファイルが配置されます。
例: https://did.staging.sakazuki.xyz/.well-known/did.json

## ファイル同期方法

```sh
sh ./rsync.sh
```
## Cloud Storage バケット
以下のcloud storage バケットを作成
参考）https://cloud.google.com/storage/docs/creating-buckets

- pitpa-staging-sakazuki-did

## CORS設定

```sh
gsutil cors set cors_setting.json gs://pitpa-staging-sakazuki-did
```