#!/bin/sh

gsutil rsync -d -r ./public $GCS_BUCKET_NAME_PRODCUTION
