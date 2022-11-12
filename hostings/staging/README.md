## hosting 方法について

サンプルでは、GCP の `Cloud Storage`, `Cloud Load Balancing`, `Cloud CDN`を利用して構築しています。
`rsync.sh`,`cors設定`は、`Cloud Storage`へのアップロードを前提としたスクリプトになります。
参照: https://cloud.google.com/storage/docs/hosting-static-website#console_1

## ファイル同期方法

```sh
sh ./rsync.sh
```

## CORS 設定

```sh
gsutil cors set cors_setting.json $GCS_BUCKET_NAME_DEVELOPMENT
```
