# Kenluk Mobile App (`reap-payment-mobile`)

This is the cross-platform mobile application companion for the Kenluk fintech portal. It is built using **React Native**, **Expo (SDK 51)**, **Expo Router (File-Based Navigation)**, **Redux Toolkit**, and styled using **NativeWind (Tailwind CSS)**.

---

## 🚀 Prerequisites

Before running the application, make sure you have the following installed on your machine:
1. **Node.js** (v18.x or later recommended)
2. **npm** or **yarn**
3. **Expo Go** app installed on your physical mobile device:
   - [App Store (iOS)](https://apps.apple.com/us/app/expo-go/id984023095)
   - [Google Play Store (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)

---

## 🛠️ Getting Started

### 1. Install Dependencies
Navigate to the mobile app directory and install the required node modules:
```bash
cd reap-payment-mobile
npm install
```

### 2. Run the Development Server
Start the Expo CLI bundler:
```bash
npx expo start
```
This will compile the TypeScript code and launch the Metro Bundler, displaying a QR code in the terminal.

### 3. Open the App on Your Device
- **Android**: Open the **Expo Go** app and tap "Scan QR Code". Scan the QR code displayed in your terminal.
- **iOS**: Open the native **Camera** app, point it at the QR code, and click the link to open it in Expo Go.
- **Simulator / Emulator**: Press `a` in the terminal to launch on an Android Emulator, or `i` to launch on iOS Simulator (requires Xcode on macOS).

---

## 🌐 Networking & Backend Integration

The mobile application is pre-configured to connect to the backend:
- **Production URL**: `https://kenluk-backend-production.up.railway.app/api` (Default)
- **Local Testing Constraint**: Mobile emulators or physical devices cannot access the host machine's local server using `localhost` or `127.0.0.1`.
  - To test with a local running backend, update the `API_BASE_URL` in `src/services/api.ts` to use your computer's local IP address (e.g., `http://192.168.1.100:5000/api`) or run an Ngrok tunnel.

---

## 📂 Project Structure

```
reap-payment-mobile/
├── app/                  # Expo Router file-based pages
│   ├── _layout.tsx       # Global root layouts (Redux providers, theme configuration)
│   ├── index.tsx         # Root redirect gate checking auth token
│   ├── (auth)/           # Authentication screens (login, signup, forgot-password)
│   ├── (tabs)/           # Main tab screens (dashboard, payments, history, profile)
│   ├── admin/            # Administrative actions & user approval views
│   └── modals/           # Custom modal overlays (wallet funding, transaction confirmation)
├── src/
│   ├── redux/            # Store configurations and slice definitions
│   │   ├── slices/       # State slices (authSlice, walletSlice, fidelityPaymentSlice)
│   │   └── store.ts      # Configures persisted local states via AsyncStorage
│   ├── services/         # API clients mapping to backend endpoints
│   └── utils/            # Shared status mappers & translation files
├── tailwind.config.js    # Tailwind styling tokens mapped to corporate brand guidelines
└── app.json              # Native app config settings
```

---

## 🎨 Theme & Styling System
The app uses custom Tailwind tokens to match the main web application's premium fintech branding. Style details are configured in `tailwind.config.js` and loaded globally:
- **Primary Color**: Deep corporate blue (`#1E3A8A`)
- **Secondary Color**: Vibrant blue (`#3B82F6`)
- **Accent Color**: Teal (`#10B981`)
- **Background**: Soft slate (`#F8FAFC`)
