1 message for version code 1
Warning
There is no deobfuscation file associated with this App Bundle. If you use obfuscated code (R8/proguard), uploading a deobfuscation file will make crashes and ANRs easier to analyse and debug. Using R8/proguard can help reduce app size. Learn more
# DropLink 🚀
### Fast, Secure Local & Wi-Fi File Sharing for Android
**Developed with ❤️ by [Muqaddas Malik](https://github.com/Muqaddas12)**

[![Latest Release](https://img.shields.io/github/v/release/Muqaddas12/droplink?label=Latest%20Release&color=blue&style=for-the-badge)](https://github.com/Muqaddas12/droplink/releases/tag/2.2.0)
[![Download APK](https://img.shields.io/badge/Download-DropLink%20v2.2.0%20APK-brightgreen?logo=android&style=for-the-badge)](https://github.com/Muqaddas12/droplink/releases/download/2.2.0/app-release.apk)
[![Platform](https://img.shields.io/badge/Platform-Android-green?logo=android&style=for-the-badge)](https://github.com/Muqaddas12/droplink)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)
[![Developer](https://img.shields.io/badge/Developer-Muqaddas%20Malik-blueviolet?logo=github&style=for-the-badge)](https://github.com/Muqaddas12)

---

## 📌 Overview

**DropLink** is an ultra-fast, cross-platform local file-sharing application designed and built by **Muqaddas Malik**. It empowers users to transfer files, photos, videos, documents, and archives directly between devices at gigabit Wi-Fi speeds — **100% offline, with zero mobile data usage and zero cloud dependency**.

Whether you want to share high-resolution videos between phones, send documents to a PC or Mac, or transfer entire folders without internet access, **DropLink** runs a lightweight native HTTP streaming server directly on your Android device. Any recipient on the same Wi-Fi or portable hotspot can access or receive files instantly using any standard web browser or the DropLink app.

---

## 📥 Download Latest Release (v2.2.0)

DropLink is ready to install! Get the latest signed production APK directly from GitHub:

* 📦 **Version:** `v2.2.0` (Build `4`)
* 📲 **Direct Download:** [**Download DropLink v2.2.0 APK (app-release.apk)**](https://github.com/Muqaddas12/droplink/releases/download/2.2.0/app-release.apk)
* 🏷️ **GitHub Release Page:** [DropLink v2.2.0 Release Notes](https://github.com/Muqaddas12/droplink/releases/tag/2.2.0)
* 👨‍💻 **Release Publisher:** [Muqaddas Malik (@Muqaddas12)](https://github.com/Muqaddas12)

---

## 🌟 Key Features

* ⚡ **Lightning Fast LAN Speeds:** Transfers run at full Wi-Fi/Hotspot bandwidth (up to 50–100+ MB/s), bypassing slow internet uploads and downloads.
* 📱 **Universal Cross-Platform Receiver:** The receiving device does **not** need the app installed! Any iPhone, iPad, Windows PC, Mac, Linux machine, or Android device can receive files by opening a local browser link or scanning the generated QR code.
* 📷 **Instant QR Code Sharing:** Connect in seconds by pointing a smartphone camera at the on-screen QR code.
* 📶 **Portable Hotspot Integration:** No Wi-Fi router nearby? DropLink includes built-in hotspot detection and one-tap hotspot launcher for seamless outdoors or on-the-go transfers.
* 🌐 **Internet Transfer Mode:** Need to share over the internet? Switch to the Internet Transfer tab with live link generation and pause/resume capabilities.
* 🔒 **100% Private & Offline:** Your files never touch external servers or third-party cloud infrastructure. All transfers are peer-to-peer within your local network.
* 📂 **Built-in File Manager:** Easily view, search, open, and organize incoming files stored directly in `Download/DropLink`.
* 🎨 **Modern Dark & Light UI:** Built with React Native and Expo New Architecture, complete with dynamic themes and smooth responsive controls.

---

## 🛠️ How It Works

```
┌───────────────────────────────────────┐
│     Sender: DropLink (Android)        │
│   • Built-in Native HTTP Server       │
│   • Generates Local URL & QR Code     │
└──────────────────┬────────────────────┘
                   │
    [Local Wi-Fi Network / Hotspot]
                   │
┌──────────────────┴────────────────────┐
│   Receiver: Any Browser or Device     │
│   • Android, iOS, Windows, Mac, Linux │
│   • Full LAN Download & Upload Speed  │
└───────────────────────────────────────┘
```

<!--  -->
1. **Pick Files:** Choose any file (videos, photos, APKs, PDFs, ZIPs) from your storage.
2. **Start Server:** Tap **Start Server** to launch a native high-speed streaming server.
3. **Connect & Transfer:**
   * Scan the on-screen **QR Code** with any camera, or
   * Type the displayed local URL (e.g., `http://192.168.x.x:8080`) into any web browser.
4. **Download Instantly:** Files stream straight to the connected device with zero compression or quality loss.

---

## 📱 DropLink Release Details

| Attribute | Details |
| :--- | :--- |
| **App Name** | DropLink |
| **Package Name** | `com.muqaddas123.droplink` |
| **Developer** | [Muqaddas Malik](https://github.com/Muqaddas12) |
| **Latest Release** | `v2.2.0` (Build `4`) |
| **Target OS** | Android 7.0 (API 24) to Android 15 (API 35) |
| **Architecture** | React Native 0.81.5 + Expo 54 (New Architecture enabled) |
| **Download APK** | [app-release.apk](https://github.com/Muqaddas12/droplink/releases/download/2.2.0/app-release.apk) |

---

## 🏗️ Technology Stack

* **Frontend Framework:** [React Native 0.81.5](https://reactnative.dev/) with [Expo SDK 54](https://docs.expo.dev/) (New Architecture / Hermes Engine)
* **Routing:** Expo Router v6 (File-based navigation)
* **Native Android Core:** Custom Kotlin Native Modules:
  * `DropLinkModule.kt` & `LocalHttpServer.kt` — High-performance concurrent local HTTP file server
  * `WifiModule.kt` — Wi-Fi network analyzer, IP resolution, and Wi-Fi hotspot management
  * `InternetTransferModule.kt` — URL-based internet transfer engine with pause/resume support
  * `OpenFileModule.kt` — Native Android Intent & MIME type file opener
  * `DropLinkFilePicker.kt` — Multi-file selection engine with Storage Access Framework (SAF)
* **Vector Graphics & QR:** `react-native-svg` & `react-native-qrcode-svg`
* **Animations:** `react-native-reanimated`

---

## 🚀 Building & Running from Source

If you want to clone, build, or contribute to DropLink:

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Android Studio](https://developer.android.com/studio) with Android SDK and NDK installed
* [JDK 17+](https://adoptium.net/)

### 1. Clone the Repository
```bash
git clone https://github.com/Muqaddas12/droplink.git
cd droplink
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run on Connected Android Device or Emulator
```bash
npx expo run:android
```

### 4. Build Release APK
```bash
cd android
./gradlew assembleRelease
```
The compiled APK will be located at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🔒 Privacy & Permissions

DropLink is built around user privacy:
* **No Account Required:** You do not need to sign up, log in, or provide personal info.
* **No Cloud Storage:** Files travel directly over your local network. No external storage or intermediary servers.
* **Transparent Permissions:** DropLink only requests essential permissions:
  * Local Network & Wi-Fi state (to configure connection and detect IP)
  * Read/Write Storage (to select files and save received downloads to `Download/DropLink`)
  * Camera / Hotspot (optional, for QR pairing and hotspot activation)

Read the complete [Privacy Policy](Privacypolicy.txt) for full details.

---

## 👨‍💻 About the Author & Developer

**Muqaddas Malik** is a software engineer and mobile app developer passionate about building performant, privacy-respecting cross-platform applications and developer utilities.

* **GitHub:** [@Muqaddas12](https://github.com/Muqaddas12)
* **Project Repository:** [https://github.com/Muqaddas12/droplink](https://github.com/Muqaddas12/droplink)
* **Email Support & Inquiries:** [muqaddas.dev@gmail.com](mailto:muqaddas.dev@gmail.com)

---

## 🤝 Contributing & Feedback

Contributions, feature requests, and bug reports are warmly welcome!
* Star ⭐ the repository to support the project.
* Open an issue on [GitHub Issues](https://github.com/Muqaddas12/droplink/issues) if you discover a bug or have an idea for an enhancement.
* Submit a Pull Request with your improvements.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details.

---

<p align="center">
  <b>DropLink</b> • Developed by <b><a href="https://github.com/Muqaddas12">Muqaddas Malik</a></b> • Made for seamless offline file sharing.
</p>