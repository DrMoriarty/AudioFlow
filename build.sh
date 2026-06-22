#!/bin/sh

VERSION=(`cat version`)

# Make universal C++ part

cmake "-DCMAKE_OSX_ARCHITECTURES=x86_64;arm64" .

make || exit 1

# Make Electron App by architectures

cd ui

#npm run make -- --universal || exit 1
npm run package -- --arch=arm64
npm run package -- --arch=x64

cd ..

# Pack tar for brew

tar -czf AudioFlow-${VERSION}.x86_64.tar.gz -C ui/out/AudioFlow-darwin-x64 AudioFlow.app

tar -czf AudioFlow-${VERSION}.arm4.tar.gz -C ui/out/AudioFlow-darwin-arm64 AudioFlow.app

