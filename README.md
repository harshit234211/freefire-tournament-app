# 🛡️ FragArena - Play. Fight. Conquer.

FragArena is a high-performance, Progressive Web App (PWA) Free Fire Tournament and Clan Domain platform built with **Next.js, TypeScript, Tailwind CSS, Express.js, and MongoDB Atlas**.

---

## 🚀 Deployment Guide (Production Launch)

To live-deploy FragArena 24x7 without needing your local laptop to remain active:

### 1. 🗄️ Database: MongoDB Atlas (Cloud Cluster)
1. Register/Login at **[mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)**.
2. Build a free **M0 Shared Cluster**.
3. Go to **Network Access** and click **"Allow Access from Anywhere" (0.0.0.0/0)**.
4. Under **Database Access**, create a user (e.g., `shakyaharshit683_db_user`) and set a secure password.
5. Click **Connect -> Drivers** and copy your Connection String URL.

---

### 2. ⚡ Backend Server: Railway Deployment
1. Log in to **[Railway.app](https://railway.app/)** with your GitHub account.
2. Click **"New Project"** -> **"Deploy from GitHub repository"**.
3. Choose the `freefire-tournament-app` or `fragarena` repository.
4. Go to the project **Variables** settings and set:
   *   `PORT` = `5000`
   *   `MONGO_URI` = `mongodb+srv://shakyaharshit683_db_user:<password>@cluster0.ieq46cq.mongodb.net/fragarena?retryWrites=true&w=majority`
   *   `JWT_SECRET` = `harshit_khiladi_battle_secret_9090`
   *   `CASHFREE_APP_ID` = `TEST10332822180010c2c310ffad542283301`
   *   `CASHFREE_SECRET_KEY` = `TEST6f2f01905abf4705574345f1b6238bfa831cc42e`
   *   `CASHFREE_ENV` = `TEST`
   *   `TELEGRAM_BOT_TOKEN` = *(Your bot token, optional)*
   *   `TELEGRAM_CHAT_ID` = *(Your chat ID, optional)*
5. Railway will launch and compile the server instantly, giving you a public URL (e.g., `https://fragarena-backend.up.railway.app`).

---

### 3. 🌐 Frontend: Vercel PWA Deployment
1. Log in to **[Vercel.com](https://vercel.com/)** with your GitHub account.
2. Click **"Add New"** -> **"Project"** -> Import your repository.
3. In the configuration settings, set **Root Directory** as `frontend/` (if deploying monorepo).
4. Add the **Environment Variable**:
   *   `NEXT_PUBLIC_API_URL` = `https://<your-railway-backend-url>/api`
5. Click **"Deploy"**. Vercel will optimize, compile, and publish your PWA.
6. Open your mobile browser, go to your Vercel URL, click **"Add to Home Screen"**, and enjoy the FragArena app standalone experience!
