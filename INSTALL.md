# Installing Toddl on a phone

## Android — direct APK link

On the phone, download and tap:

**https://github.com/Jigglebox/Toddl/releases/latest/download/toddl.apk**

Android will ask once to allow "install unknown apps" for the browser —
allow it, then tap the downloaded file again. This link always serves the
newest build (CI republishes it on every push).

## iPhone — install as a web app

Apple doesn't allow installing native apps from a link without the App
Store or TestFlight, but Toddl is a full offline web app, so:

1. Open **https://jigglebox.github.io/Toddl/** in Safari
2. Tap Share (the square-with-arrow) → **Add to Home Screen**
3. Launch it from the new home-screen icon

It runs fullscreen (no browser chrome), locks to landscape, and works
completely offline after the first launch — the same code as the native
app. For a toddler-locked session, turn on Guided Access
(Settings → Accessibility) and triple-click the side button in the app.

## Xcode (native iOS build)

For a true native install on your own iPhone: clone the repo, run
`npm ci && npx cap sync ios`, open `ios/App/App.xcworkspace` in Xcode,
select your phone, and press Run with your personal team selected for
signing (free Apple ID works; the install expires after 7 days,
a paid developer account removes that limit).
