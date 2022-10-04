## 公開 URL

https://did.staging.sakazuki.xyz 配下に public ディレクトリのファイルが配置されます。
例: https://did.staging.sakazuki.xyz/.well-known/did.json

## ファイル同期方法

```sh
sh ./rsync.sh
```

## Cloud Storage バケット

pitpa-staging プロジェクト

- pitpa-staging-sakazuki-did-cit

## CORS設定

```sh
gsutil cors set cors_setting.json gs://pitpa-staging-sakazuki-did-cit
```