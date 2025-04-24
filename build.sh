#!/bin/bash

set -e

echo "🛠  Building TypeScript..."
npm run build

echo "🗂  Copying manifest and icons..."
cp manifest.json dist/
mkdir -p dist/icons
cp -r icons/* dist/icons/

echo "🗜  Creating ZIP..."
cd dist
zip -r ../screenshot-helper.zip ./*
cd ..

echo "✅ Done! Packed extension is in screenshot-helper.zip"