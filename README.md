# Khiladi Battle - Free Fire eSports Tournament App

Khiladi Battle is a premium, high-performance hybrid Android & Web application designed for hosting and playing Free Fire eSports Tournaments. It features dynamic room creation, auto-releasing codes, live chat support, secure JWT authentication, and Cashfree Payment Gateway Integration.

---

## 📂 Project Directory Structure

```text
freefire-tournament-app/
├── backend/                  # Node.js Express API Backend
│   ├── models/               # MongoDB Database Schemas
│   │   ├── User.js           # User registration, wallets & roles
│   │   ├── Tournament.js     # Match rooms, countdowns & entry details
│   │   ├── Transaction.js    # Deposits & withdrawals logs
│   │   └── Announcement.js   # Live board broadcasts
│   ├── routes/               # Express Endpoint Controllers
│   │   ├── auth.js           # Signup, JWT Login, Profile setup
│   │   ├── tournaments.js    # Join match, assign host, release rooms
│   │   └── wallet.js         # Cashfree order tokens & verification API
│   ├── server.js             # Main server logic & seeder hooks
│   ├── package.json          # Node dependencies (Express, Mongoose, JWT)
│   └── .env                  # Port, MongoDB URI & Cashfree credentials
├── www/                      # HTML5/CSS3/JS Web UI App (Capacitor Web Assets)
│   ├── index.html            # Premium gaming Dashboard & panels
│   ├── style.css             # Cyberpunk/Neonorange styling & glassmorphism
│   └── app.js                # Core frontend client, Cashfree SDK, dynamic URLs
├── android/                  # Native Android App Workspace (Capacitor Container)
│   ├── app/                  # Android build files, AndroidManifest, Gradle
│   └── gradlew               # Gradle executable wrapper
├── capacitor.config.json     # Capacitor cross-platform setup
├── run_backend.bat           # One-click administrator backend launcher
└── README.md                 # Complete system guide
```

---

## ⚡ Quick Start: Running Locally

### 1. Database Setup
1. Ensure **MongoDB** is running locally on your computer on the default port `27017`.
2. The server will automatically connect to `mongodb://localhost:27017/khiladibattle`.

### 2. Launch the Backend Server
1. Go to the project directory: `freefire-tournament-app`.
2. Right-click **`run_backend.bat`** and select **Run as Administrator** (this will open port 5000 in your firewall and allow local connections).
3. The server will start on `http://localhost:5000` and seed default accounts.

### 3. Open the Web App
1. Drag and drop `www/index.html` into your Google Chrome browser, or copy this address:
   `file:///C:/Users/shaky/OneDrive/Desktop/freefire-tournament-app/www/index.html`

---

## 🔑 Default Test Accounts (Seeded)

Use these credentials to test the dashboard immediately:

* **Super Admin Profile:**
  * **Phone**: `9999999999`
  * **Password**: `adminpassword`
  *(Access user management, withdraw requests, broadcasts, and match creation)*

* **Host Profile:**
  * **Phone**: `8888888888`
  * **Password**: `hostpassword`
  *(Access host panel, upload room details, and submit winner listings)*

* **Player Warrior Profile:**
  * **Phone**: `7777777777`
  * **Password**: `playerpassword`
  *(Access wallet deposit simulator, joined lobbies, and profile name setups)*

---

## 📱 Mobile APK & AAB Compilation Guide

The mobile app is configured using **Capacitor**. To build the APK/AAB:

### 1. Sync Web Assets with Native Android
Whenever you modify `www/index.html`, `www/style.css`, or `www/app.js`, push the assets to the Android folder:
```bash
npx cap sync
```

### 2. Build the Debug APK (Command Line)
To compile the APK without opening Android Studio, navigate to `android/` directory and run:
```powershell
./gradlew assembleDebug
```
The compiled file will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Build Production AAB (Play Store)
To compile the AAB bundle file for Google Play Store upload:
1. Open **Android Studio**.
2. Open the `android` folder as a project.
3. In the top menu, go to **Build > Generate Signed Bundle / APK**.
4. Select **Android App Bundle** and click Next.
5. Create a secure keystore file, fill in the passwords, and select **Release** build.
6. The compiled `.aab` file will be generated in your designated output folder ready for Play Console.

---

## 🛡️ Production Cloud Deployment Guide

To deploy the app so it works 24/7 without needing your laptop turned on:

### 1. Deploy Database (MongoDB Atlas)
1. Register a free account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Shared Cluster (Free).
3. Whitelist access from all IPs (`0.0.0.0/0`).
4. Copy the connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.net/khiladibattle`).

### 2. Deploy Server (Render)
1. Sign up on [Render.com](https://render.com/) using your GitHub account.
2. Push your `backend` directory to a new GitHub repository.
3. Create a **New Web Service** and link your repository.
4. Set the following environment configurations:
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
5. In the **Environment Variables** tab, add your live cluster link:
   * `MONGO_URI` = `your_mongodb_atlas_connection_string`
   * `JWT_SECRET` = `your_secure_secret_key`
   * `CASHFREE_APP_ID` = `your_live_cashfree_app_id`
   * `CASHFREE_SECRET_KEY` = `your_live_cashfree_secret_key`
   * `CASHFREE_ENV` = `PRODUCTION`
6. Click Deploy. Your API is now live on `https://your-app.onrender.com`!

### 3. Build the Live APK
Update the `API_URL` variable at the top of `www/app.js` with your Render service URL, sync using `npx cap sync`, and recompile the APK.
