#!/bin/sh

VERSION=(`cat version`)

echo Packing AudioFlow ${VERSION}

# arch x86_64

rm -rf pkgroot

mkdir -p pkgroot/Applications
mkdir -p pkgroot/Library/Audio/Plug-Ins/HAL

cp -R ui/out/AudioFlow-darwin-x64/AudioFlow.app pkgroot/Applications/

cp -R driver/BlackHole.driver pkgroot/Library/Audio/Plug-Ins/HAL/


pkgbuild \
    --root pkgroot \
    --scripts scripts \
    --identifier com.DrMoriarty.AudioFlow \
    --version "${VERSION}" \
    --install-location / \
    component.pkg


productbuild \
    --distribution distribution.xml \
    --package-path . \
    --resources . \
    AudioFlow-${VERSION}-x64.pkg

# arch arm64

rm -rf pkgroot

mkdir -p pkgroot/Applications
mkdir -p pkgroot/Library/Audio/Plug-Ins/HAL

cp -R ui/out/AudioFlow-darwin-arm64/AudioFlow.app pkgroot/Applications/

cp -R driver/BlackHole.driver pkgroot/Library/Audio/Plug-Ins/HAL/


pkgbuild \
    --root pkgroot \
    --scripts scripts \
    --identifier com.DrMoriarty.AudioFlow \
    --version "${VERSION}" \
    --install-location / \
    component.pkg


productbuild \
    --distribution distribution.xml \
    --package-path . \
    --resources . \
    AudioFlow-${VERSION}-arm64.pkg

# cleanup

rm component.pkg
rm -rf pkgroot
