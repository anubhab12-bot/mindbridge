# MindBridge — Free Cloud Deployment Guide

MindBridge can be deployed completely free across several modern cloud hosting providers.

## Architecture & Free Tier Breakdown

| Component | Stack | Recommended Free Host | Notes |
|---|---|---|---|
| **Web Frontend** | Angular 21 (SPA) | **Vercel** or **Render** (Static) | Free forever, automatic SSL, continuous deployment |
| **Backend API** | NestJS 12 (Node.js 22) | **Render** (Free Web Service) or **Koyeb** | Free web service, spins down on idle |
| **AI Service** | FastAPI (Python 3.13) | **Render** (Free Web Service) | Free web service |
| **Database** | MongoDB | **MongoDB Atlas (M0)** | 512 MB free forever, no credit card required |
| **Cache & Queue** | Redis | **Upstash Redis** | 10,000 commands/day free forever, no credit card |

---

## 1. Push to GitHub

If you haven't pushed to GitHub yet:

1. Create a new repository on [GitHub](https://github.com/new) named `mindbridge` (can be public or private).
2. Push your local repository:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/mindbridge.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Option A: 1-Click Deployment on Render (Full Stack)

Render supports multi-service deployments directly from your repository using the included `render.yaml`.

1. Sign up / Log in to [Render.com](https://render.com) using your GitHub account.
2. Go to **Blueprints** > click **New Blueprint Instance**.
3. Select your `mindbridge` repository.
4. Render will detect `render.yaml` and configure:
   - `mindbridge-web` (Frontend static site)
   - `mindbridge-api` (NestJS backend API)
   - `mindbridge-ai` (FastAPI AI companion)
5. Fill in your environment variables for `mindbridge-api`:
   - `MONGO_URI`: Your free MongoDB Atlas connection string.
   - `REDIS_URL`: Your free Upstash Redis connection string.
6. Click **Apply**. Render will automatically build and deploy all services.

---

## 3. Option B: Frontend on Vercel (Fastest & Simplest)

If you want the web frontend live immediately:

1. Go to [Vercel](https://vercel.com) and log in with GitHub.
2. Click **Add New...** > **Project**.
3. Import your `mindbridge` repository.
4. Vercel automatically detects `vercel.json`:
   - Build Command: `cd packages/shared-types && npm ci && npm run build && cd ../../apps/web && npm ci && npm run build -- --configuration production`
   - Output Directory: `apps/web/dist/web/browser`
5. Click **Deploy**. Your Angular app will be live at `https://mindbridge-xxx.vercel.app`.

---

## 4. Free Databases Setup

### Free MongoDB (MongoDB Atlas)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register).
2. Choose the **M0 Free Cluster** (Shared, 512MB).
3. Create a database user (username and password).
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere).
5. Click **Connect** > **Drivers** and copy your connection string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/mindbridge?retryWrites=true&w=majority`

### Free Redis (Upstash)
1. Go to [upstash.com](https://upstash.com) and sign in.
2. Click **Create Database** > Redis.
3. Select the **Free Tier**.
4. Copy the `rediss://...` connection URL into your `REDIS_URL` setting.
