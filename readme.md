<<<<<<< HEAD
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
=======
# 🚀 DropLink

### Fast, Simple & Local File Sharing Over Wi-Fi

**DropLink** is a local file-sharing application designed to make transferring files between nearby devices fast, simple, and convenient.

Instead of uploading files to a cloud service, DropLink allows devices connected to the **same Wi-Fi network** to communicate directly through a local sharing server.

> **DropLink — Share files. Stay local.**

---

## 📱 About DropLink

DropLink is a **Wi-Fi based local file-sharing application** developed by **Muqaddas Malik**.

The goal of DropLink is simple:

**Make transferring files between nearby devices as easy as opening a link.**

DropLink can be useful when transferring files between:

* 📱 Android phones
* 💻 Windows PCs
* 💻 Laptops
* 🖥️ Desktop computers
* 📲 Other devices connected to the same local network

No cloud upload is required for local transfers.

---

## ✨ Features

### 📡 Local Wi-Fi File Sharing

Transfer files between devices connected to the same Wi-Fi network.

### ⚡ Fast Transfers

Files can be transferred directly through the local network without first uploading them to an external cloud server.

### 🔗 Easy Sharing

DropLink provides a simple way for another device to access the shared files through a local network link.

### 📂 File Sharing

Share files between supported devices using the DropLink interface.

### 🔒 Local Network

Your files can remain within your local network during the transfer instead of being uploaded to a third-party cloud storage service.

### 🎯 Simple Interface

DropLink focuses on keeping the file-sharing process straightforward and easy to understand.

---

## 🧠 How DropLink Works

DropLink uses a **local server** to make files available to other devices on the same network.

The basic process is:

```text
┌─────────────────┐
│   Device A      │
│  DropLink App   │
└────────┬────────┘
         │
         │ Local Wi-Fi
         │
         ▼
┌─────────────────┐
│  DropLink       │
│  Local Server   │
└────────┬────────┘
         │
         │ Local Network
         │
         ▼
┌─────────────────┐
│   Device B      │
│ Web Browser /   │
│ Supported App   │
└─────────────────┘
```

The receiving device connects to the local address provided by DropLink and can access the available sharing interface.

---

## 🔄 Typical Workflow

### 1️⃣ Connect to the Same Wi-Fi

Connect both devices to the same local Wi-Fi network.

### 2️⃣ Open DropLink

Start DropLink on the device that will provide the files.

### 3️⃣ Select or Share Files

Choose the files you want to make available.

### 4️⃣ Get the Local Link

DropLink provides a local network address that can be opened by another device.

### 5️⃣ Open the Link

Open the link on the receiving device.

### 6️⃣ Transfer the Files

Download or transfer the shared files directly through the local network.

---

## 🌐 Why Local File Sharing?

Traditional file-sharing methods often involve:

* Cloud uploads
* Third-party storage
* Internet dependency
* File-size restrictions
* Waiting for uploads before downloading

DropLink takes a different approach.

When devices are on the same local network, files can be transferred using the network connection between the devices.

### ☁️ Cloud-Based Sharing

```text
Device A
   │
   ▼
Cloud Server
   │
   ▼
Device B
```

### 📡 DropLink Local Sharing

```text
Device A
   │
   │ Wi-Fi
   ▼
Device B
```

This can make local transfers faster and more convenient, especially for large files and nearby devices.

---

## 🛠️ Technology

DropLink is built around a local-network file-sharing architecture.

Depending on the platform and implementation, the project may use technologies such as:

* Local HTTP server
* Wi-Fi networking
* Web-based file sharing
* Device-to-device communication
* Local network addressing
* File system access

See the project source code for the current implementation and dependencies.

---

## 📋 Requirements

To use DropLink for local sharing:

* A supported device
* DropLink installed
* Wi-Fi or a compatible local network
* Both devices connected to the same network when using local-network sharing

> **Note:** Network configuration can affect whether devices can communicate with each other. Some public, enterprise, or guest Wi-Fi networks may isolate connected devices.

---

## 🔐 Privacy

DropLink is designed around **local file sharing**.

When sharing files over a local network, the transfer can occur between devices on that network rather than requiring the files to be uploaded to a cloud storage provider.

However, users should always understand their network environment.

### ⚠️ Important

Anyone who can access the sharing address and is able to communicate with the DropLink server may potentially access files that have been made available.

For this reason:

* Only share files you intend to share.
* Use DropLink on networks you trust.
* Stop the sharing server when you are finished.
* Avoid exposing a local sharing server directly to the public internet unless the application specifically supports and secures that use case.

---

## 🚧 Project Status

DropLink is an actively developed project.

The current release represents an important milestone in the development of the application.

Future versions may introduce improvements such as:

* Better device discovery
* Improved transfer experience
* Transfer progress indicators
* Improved UI
* Better network handling
* Additional file-management features
* Improved sharing controls
* Additional platform support

Features may change as development continues.

---

## 📥 Installation

Download the latest available release from the project's GitHub Releases page.

**Latest Release:**
https://github.com/Muqaddas12/droplink/releases

You can also clone the repository:

```bash
git clone https://github.com/Muqaddas12/droplink.git
```

Then open the project in your preferred development environment and follow the project's build instructions.

---

## 💻 Development

Clone the repository:

>>>>>>> 406614e7bc57f8c51f98e9f9aad0eb1dbbfd6dc1
```bash
git clone https://github.com/Muqaddas12/droplink.git
cd droplink
```

<<<<<<< HEAD
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
=======
Install the project's dependencies according to the package configuration included in the repository.

Then build or run the application using the appropriate development commands for the current project.

---

## 🤝 Contributing

Contributions are welcome!

If you have an idea, bug report, improvement, or feature request, you can contribute by:

1. ⭐ Starring the repository
2. 🐛 Opening an issue
3. 💡 Suggesting new features
4. 🔧 Submitting a pull request
5. 📖 Improving documentation

Before submitting a pull request, please make sure your changes are tested and clearly described.

---

## 🐛 Bug Reports

Found a problem?

Please open an issue on GitHub and include:

* Device/platform
* Operating system version
* DropLink version
* Steps to reproduce the problem
* Expected behavior
* Actual behavior
* Screenshots or logs when useful

This information makes it easier to investigate and fix issues.

---

## 💡 Feature Requests

Have an idea for DropLink?

Open a feature request and explain:

* What you want to add
* Why it would be useful
* How you expect the feature to work
* Any examples of similar functionality

Community feedback can help shape future versions of DropLink.

---

## ⭐ Support the Project

If you find **DropLink** useful, consider giving the project a ⭐ **Star** on GitHub.

It helps the project gain visibility and encourages further development.

**GitHub:**
https://github.com/Muqaddas12/droplink

---

## 👨‍💻 Developer

### Muqaddas Malik

**DropLink** is developed by **Muqaddas Malik**.

The project is part of an effort to create simple and practical tools for everyday device-to-device file sharing.

**GitHub:**
https://github.com/Muqaddas12

**DropLink:**
https://github.com/Muqaddas12/droplink

---

## 🔎 Search Keywords

DropLink is a **local file sharing application**, **Wi-Fi file transfer app**, and **device-to-device file sharing tool**.

Relevant search terms include:

`DropLink` · `DropLink App` · `DropLink File Sharing` · `WiFi File Sharing` · `WiFi File Transfer` · `Local File Sharing` · `Local File Transfer` · `Device to Device File Sharing` · `File Transfer App` · `Android File Sharing` · `LAN File Sharing` · `Local Network File Sharing` · `Muqaddas Malik` · `Muqaddas12`

---

## 📜 License

See the `LICENSE` file in this repository for the license and terms applicable to DropLink.

---

## 🚀 DropLink

**Fast. Local. Simple.**

Transfer files between nearby devices over your local network without unnecessary cloud uploads.

**Built by Muqaddas Malik.**

⭐ If DropLink helps you, star the repository and share it with others.

---

### 🔗 Links

* **Repository:** https://github.com/Muqaddas12/droplink
* **Releases:** https://github.com/Muqaddas12/droplink/releases
* **Developer:** https://github.com/Muqaddas12
>>>>>>> 406614e7bc57f8c51f98e9f9aad0eb1dbbfd6dc1
