# Building Toddl for the App Store and Google Play

The app is a Capacitor project: the web app in `www/` is wrapped in native
shells in `ios/` (Xcode) and `android/` (Android Studio / Gradle).

Whenever you change anything in `www/`, re-sync it into both native
projects before building:

```bash
npm install
npx cap sync
```

---

## iOS (Xcode → App Store)

Requires a Mac with Xcode 15+ and CocoaPods (`sudo gem install cocoapods`).

```bash
npx cap sync ios          # runs pod install on macOS
npx cap open ios          # opens ios/App/App.xcworkspace in Xcode
```

Then in Xcode:

1. Select the **App** target → *Signing & Capabilities* → choose your Apple
   Developer team. The bundle ID is `com.jigglebox.toddl` (change it in both
   Xcode and `capacitor.config.json` if you need a different one).
2. Select **Any iOS Device (arm64)** and run *Product → Archive*.
3. In the Organizer, **Distribute App → App Store Connect → Upload**.
4. In [App Store Connect](https://appstoreconnect.apple.com): create the app,
   pick the build, fill in metadata, and submit for review.

App Store specifics for a toddler app:

- Set the **age rating** questionnaire honestly (lands at 4+).
- To appear in the **Kids category**, opt in under *App Information →
  Kids Category* (ages 5 and under). Kids-category apps must have **no
  third-party analytics or advertising** and may not link out of the app
  without a parental gate — Toddl has no analytics, no ads, no external
  links, and makes no network requests at all, so it qualifies as-is.
- You'll need a **privacy policy URL** even for an app that collects
  nothing; state that no data is collected. In the App Privacy section,
  declare "Data Not Collected".

## Android (Android Studio / Gradle → Google Play)

Requires the Android SDK (installed automatically by Android Studio).

```bash
npx cap sync android
npx cap open android      # opens android/ in Android Studio
```

Or build from the command line:

```bash
cd android
./gradlew assembleDebug   # installable test APK
./gradlew bundleRelease   # app bundle for Play (needs signing, below)
```

The GitHub Actions workflow (`.github/workflows/build-mobile.yml`) also
builds a debug APK and an unsigned release AAB on every push — grab them
from the workflow run's artifacts.

### Signing for Play

Create a keystore once and keep it safe (do **not** commit it — it's
gitignored):

```bash
keytool -genkey -v -keystore toddl-release.keystore \
  -alias toddl -keyalg RSA -keysize 2048 -validity 10000
```

Then add to `android/keystore.properties` (also uncommitted) and wire it in
`android/app/build.gradle`, or simply sign in Android Studio via
*Build → Generate Signed App Bundle*. Upload the `.aab` in the
[Play Console](https://play.google.com/console).

Google Play specifics for a toddler app:

- In *Policy → App content*, complete the **Target audience** section
  (ages 5 and under). This puts the app under the **Families policy**.
- Complete the **Data safety** form: Toddl collects nothing, shares
  nothing, and makes no network requests.
- Families-policy apps must not have ads/analytics SDKs — Toddl has zero
  third-party dependencies at runtime, so it complies as-is.
- Provide a privacy policy URL stating no data is collected.
- Complete the content rating (IARC) questionnaire (rates Everyone).

### Versioning

Bump before each store upload:

- **Android:** `versionCode` (integer, must increase every upload) and
  `versionName` in `android/app/build.gradle`.
- **iOS:** *Version* and *Build* on the App target in Xcode (or
  `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in the project file).

### Icons & splash screens

All native icons/splashes are generated from `resources/`:

```bash
node resources/make-assets.js     # rasterize the SVG sources
npx capacitor-assets generate     # regenerate all platform assets
```

Edit `resources/icon.svg` (and the splash SVG inside
`resources/make-assets.js`) and re-run both commands to rebrand.
