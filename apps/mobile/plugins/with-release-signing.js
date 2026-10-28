/* eslint-disable @typescript-eslint/no-require-imports */
// Expo lädt Config-Plugins per require; das Paket liegt ohne "type": "module" vor.
const { withAppBuildGradle } = require('expo/config-plugins');

// Expo's prebuild template signs the release build with the debug keystore.
// Google Play rejects such an upload ("signed with the wrong key"), so every
// prebuild has to re-add the PfotenNetz upload key. The credentials themselves
// live outside the repository in ~/.gradle/gradle.properties.
const RELEASE_SIGNING_CONFIG = `        release {
            def uploadStoreFile = findProperty('PFOTENNETZ_UPLOAD_STORE_FILE')
            if (uploadStoreFile == null) {
                throw new GradleException('PFOTENNETZ_UPLOAD_STORE_FILE fehlt in ~/.gradle/gradle.properties. Ohne den PfotenNetz-Upload-Key wird das Release sonst mit dem Debug-Key signiert.')
            }
            storeFile file(uploadStoreFile)
            storePassword findProperty('PFOTENNETZ_UPLOAD_STORE_PASSWORD')
            keyAlias findProperty('PFOTENNETZ_UPLOAD_KEY_ALIAS')
            keyPassword findProperty('PFOTENNETZ_UPLOAD_KEY_PASSWORD')
        }
`;

const DEBUG_SIGNING_ANCHOR = `            keyPassword 'android'
        }
    }
    buildTypes {`;

const RELEASE_BUILD_TYPE = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    if (contents.includes('signingConfigs.release')) {
      return mod;
    }

    if (!contents.includes(DEBUG_SIGNING_ANCHOR)) {
      throw new Error(
        'with-release-signing: unerwartete build.gradle-Struktur (Debug-Signing-Block nicht gefunden).'
      );
    }
    contents = contents.replace(
      DEBUG_SIGNING_ANCHOR,
      `            keyPassword 'android'
        }
${RELEASE_SIGNING_CONFIG}    }
    buildTypes {`
    );

    if (!RELEASE_BUILD_TYPE.test(contents)) {
      throw new Error(
        'with-release-signing: unerwartete build.gradle-Struktur (Release-BuildType nicht gefunden).'
      );
    }
    contents = contents.replace(
      RELEASE_BUILD_TYPE,
      '$1signingConfig signingConfigs.release'
    );

    mod.modResults.contents = contents;
    return mod;
  });
};
