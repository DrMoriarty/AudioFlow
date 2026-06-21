#!/bin/sh

# Make universal C++ part

cmake "-DCMAKE_OSX_ARCHITECTURES=x86_64;arm64" .

make || exit 1

# Make Electron App by architectures

cd ui

#npm run make -- --universal || exit 1
npm run package -- --arch=arm64
npm run package -- --arch=x64

cd ..

