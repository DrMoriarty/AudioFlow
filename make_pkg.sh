#!/bin/sh


# arch x86_64

rm -rf pkgroot

mkdir -p pkgroot/Applications
mkdir -p pkgroot/Library/Audio/Plug-Ins/HAL

cp -R ui/out/AudioFlow-darwin-x64/AudioFlow.app pkgroot/Applications/

cp -R assets/driver/BlackHole.driver pkgroot/Library/Audio/Plug-Ins/HAL/


pkgbuild \
    --root pkgroot \
    --scripts scripts \
    --identifier com.DrMoriarty.AudioFlow \
    --version 2.0.0 \
    --install-location / \
    component.pkg


productbuild \
    --distribution distribution.xml \
    --package-path . \
    --resources . \
    AudioFlow-x64.pkg

# arch arm64

rm -rf pkgroot

mkdir -p pkgroot/Applications
mkdir -p pkgroot/Library/Audio/Plug-Ins/HAL

cp -R ui/out/AudioFlow-darwin-arm64/AudioFlow.app pkgroot/Applications/

cp -R assets/driver/BlackHole.driver pkgroot/Library/Audio/Plug-Ins/HAL/


pkgbuild \
    --root pkgroot \
    --scripts scripts \
    --identifier com.DrMoriarty.AudioFlow \
    --version 2.0.0 \
    --install-location / \
    component.pkg


productbuild \
    --distribution distribution.xml \
    --package-path . \
    --resources . \
    AudioFlow-arm64.pkg

# cleanup

rm component.pkg
rm -rf pkgroot
