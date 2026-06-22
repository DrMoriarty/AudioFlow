const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { execSync } = require('child_process');
const path = require('path');

module.exports = {
  hooks: {
    postPackage: async (config, options) => {
      const outputPath = options.outputPaths[0];
      const appPath = path.join(outputPath, 'AudioFlow.app');
      execSync(`codesign --deep --force --sign - --entitlements ${path.resolve(__dirname, 'entitlements.plist')} "${appPath}"`);
      execSync(`codesign --force --sign - --entitlements ${path.resolve(__dirname, 'entitlements.child.plist')} "${path.join(appPath, 'Contents', 'Resources', 'build', 'AudioFlow')}"`);
      console.log('[AudioFlow] Ad-hoc signed with audio entitlements');
    }
  },
  packagerConfig: {
      asar: true,
      icon: '../icon/AudioFlow',
      extraResource: [
	  '../assets',
	  '../build'
      ],
      extendInfo: {
	  NSMicrophoneUsageDescription: 'AudioFlow needs microphone access to capture system audio via the BlackHole loopback driver for real-time equalization.'
      },
      osxSign: false,
      osxNotarize: false
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
