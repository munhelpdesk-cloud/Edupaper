# Runs in CI after `cap add android`. Makes every build use the same signing key and a higher versionCode,
# so a new APK installs over the old one (no uninstall needed).
import os, re, shutil
run = os.environ.get('GITHUB_RUN_NUMBER', '1')
shutil.copy('signing/edupaper.keystore', 'android/app/edupaper.keystore')
p = 'android/app/build.gradle'
s = open(p).read()
s = re.sub(r'versionCode\s+\d+', 'versionCode ' + run, s)
s = re.sub(r'versionName\s+"[^"]*"', 'versionName "1.0.' + run + '"', s)
sign = '''    signingConfigs {
        release {
            storeFile file("edupaper.keystore")
            storePassword "edupaper123"
            keyAlias "edupaper"
            keyPassword "edupaper123"
        }
    }
'''
assert 'buildTypes {' in s
s = s.replace('    buildTypes {', sign + '    buildTypes {', 1)
s = s.replace('buildTypes {\n', 'buildTypes {\n        debug {\n            signingConfig signingConfigs.release\n        }\n', 1)
s = s.replace('        release {\n            minifyEnabled', '        release {\n            signingConfig signingConfigs.release\n            minifyEnabled', 1)
open(p, 'w').write(s)
print('signed build, versionCode', run)
