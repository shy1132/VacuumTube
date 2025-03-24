#!/bin/bash

DIR=$(dirname "$0")
LOCK_FILE="$DIR/../package-lock.json"
OUTPUT="$DIR/generated-sources.json"

if ! command -v flatpak-node-generator >/dev/null 2>&1
then
    echo "flatpak-node-generator from https://github.com/flatpak/flatpak-builder-tools is required to generate the sources"
    exit 1
fi

flatpak-node-generator npm $LOCK_FILE -o $OUTPUT