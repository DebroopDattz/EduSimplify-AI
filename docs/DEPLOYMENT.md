# EduSimplify AI – Deployment Guide

This guide walks through every step required to take EduSimplify AI from a local clone to a fully running production environment.

---

## Table of Contents

1. [IBM Cloud Setup](#ibm-cloud-setup)
   - [1.1 watsonx.ai](#11-watsonxai)
   - [1.2 Cloud Object Storage](#12-cloud-object-storage)
   - [1.3 Cloudant](#13-cloudant)
   - [1.4 App ID](#14-app-id)
2. [Environment Variables Reference](#environment-variables-reference)
3. [Deploy Frontend to Vercel](#deploy-frontend-to-vercel)
4. [Deploy Backend to Render](#deploy-backend-to-render)
5. [GitHub Actions Secrets](#github-actions-secrets)
6. [Domain Setup](#domain-setup)
7. [Post-Deployment Checklist](#post-deployment-checklist)

---

## IBM Cloud Setup

All four IBM Cloud services can be provisioned from the [IBM Cloud Catalog](https://cloud.ibm.com/catalog). A Lite (free) plan is available for each service and is sufficient for development and demos.

### 1.1 watsonx.ai

1. In the IBM Cloud console, search for **watsonx.ai** and click **Create**.
2. Choose the **Dallas (us-south)** region (closest to Render's Oregon region for low latency).
3. Select the **Lite** plan and click **Create**.
4. Once provisioned, open the service and go to **Manage → Access (IAM)**.
5. Click **Create API key**, name it `edusimplify-watsonx`, and copy the key — it is only shown once.
6. Navigate to the **Projects** tab inside watsonx.ai Studio and create a new project called `edusimplify`.
7. Copy the **Project ID** from the project settings URL (UUID format).

**Values to save:**
```
IBM_WATSONX_API_KEY    = <api key from step 5>
IBM_WATSONX_PROJECT_ID = <project id from step 7>
IBM_WATSONX_URL        = https://us-south.ml.cloud.ibm.com
```

---

### 1.2 Cloud Object Storage

1. Search for **Object Storage** in the catalog, select **IBM Cloud Object Storage**, choose the **Lite** plan.
2. Name the instance `edusimplify-cos` and click **Create**.
3. Inside the COS instance, go to **Buckets → Create bucket**.
   - Name: `edusimplify-documents`
   - Resiliency: **Regional**
   - Location: **us-south**
   - Storage class: **Standard**
4. Go to **Service credentials → New credential**.
   - Role: **Writer**
   - Enable **HMAC credentials** (toggle on)
   - Click **Add**.
5. Expand the credential and note:
   - `apikey` → `IBM_COS_API_KEY`
   - `resource_instance_id` → `IBM_COS_INSTANCE_CRN`
6. The public endpoint for `us-south` regional storage is:
   `https://s3.us-south.cloud-object-storage.appdomain.cloud`

**Values to save:**
```
IBM_COS_API_KEY        = <apikey from credential>
IBM_COS_INSTANCE_CRN   = <resource_instance_id from credential>
IBM_COS_ENDPOINT       = https://s3.us-south.cloud-object-storage.appdomain.cloud
IBM_COS_BUCKET_NAME    = edusimplify-documents
```

---

### 1.3 Cloudant

1. Search for **Cloudant** in the catalog, select the **Lite** plan.
2. Name the instance `edusimplify-cloudant`, choose **IAM** authentication, and click **Create**.
3. Once provisioned, open **Manage → Access (IAM) → Service credentials → New credential**.
   - Role: **Manager**
   - Click **Add**.
4. Expand the credential and note:
   - `url` → `IBM_CLOUDANT_URL`
   - `apikey` → `IBM_CLOUDANT_API_KEY`
5. Open the Cloudant Dashboard (Launch Dashboard button) and create a database named `edusimplify-sessions`.
6. In the Cloudant Dashboard, create a **JSON index** on the `edusimplify-sessions` database:
   ```json
   {
     "index": { "fields": ["user_id", "created_at"] },
     "name": "user-date-index",
     "type": "json"
   }
   ```

**Values to save:**
```
IBM_CLOUDANT_URL     = <url from credential>
IBM_CLOUDANT_API_KEY = <apikey from credential>
IBM_CLOUDANT_DB_NAME = edusimplify-sessions
```

---

### 1.4 App ID

1. Search for **App ID** in the catalog, select the **Lite** plan, name it `edusimplify-appid`, and click **Create**.
2. In the App ID dashboard, go to **Manage Authentication → Authentication Settings**.
   - Add your frontend URL to **Web Redirect URLs**:
     - `http://localhost:3000/callback` (development)
     - `https://edusimplify.vercel.app/callback` (production)
3. Go to **Applications → Add application**.
   - Name: `edusimplify-frontend`
   - Type: **Single-page application**
   - Click **Save**.
4. Expand the application and copy:
   - `clientId` → `IBM_APPID_CLIENT_ID`
   - `secret` → `IBM_APPID_CLIENT_SECRET`
   - `tenantId` → `IBM_APPID_TENANT_ID`
   - `oauthServerUrl` → `IBM_APPID_OAUTH_SERVER_URL`
5. Under **Identity Providers**, enable **Cloud Directory** and optionally Google or GitHub.
6. Under **Login Customization**, upload your logo and set brand colours.

**Values to save:**
```
IBM_APPID_TENANT_ID        = <tenantId>
IBM_APPID_CLIENT_ID        = <clientId>
IBM_APPID_CLIENT_SECRET    = <secret>
IBM_APPID_OAUTH_SERVER_URL = <oauthServerUrl>
```

---

## Environment Variables Reference

### Backend (complete list)

| Variable | Required | Description |
|---|---|---|
| `APP_ENV` | ✅ | `production` \| `development` \| `test` |
| `APP_SECRET_KEY` | ✅ | Random 64-char string; used for internal signing |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated list of allowed CORS origins |
| `IBM_WATSONX_API_KEY` | ✅ | IBM IAM API key for watsonx.ai |
| `IBM_WATSONX_PROJECT_ID` | ✅ | watsonx.ai project UUID |
| `IBM_WATSONX_URL` | ✅ | `https://us-south.ml.cloud.ibm.com` |
| `IBM_WATSONX_MODEL_ID` | ✅ | `ibm/granite-13b-chat-v2` |
| `IBM_WATSONX_EMBED_MODEL_ID` | ✅ | `ibm/slate-30m-english-rtrvr` |
| `IBM_COS_API_KEY` | ✅ | IBM COS IAM API key |
| `IBM_COS_INSTANCE_CRN` | ✅ | COS instance CRN |
| `IBM_COS_ENDPOINT` | ✅ | Regional COS endpoint URL |
| `IBM_COS_BUCKET_NAME` | ✅ | Target bucket name |
| `IBM_CLOUDANT_URL` | ✅ | Cloudant instance URL |
| `IBM_CLOUDANT_API_KEY` | ✅ | Cloudant IAM API key |
| `IBM_CLOUDANT_DB_NAME` | ✅ | Cloudant database name |
| `IBM_APPID_TENANT_ID` | ✅ | App ID tenant UUID |
| `IBM_APPID_CLIENT_ID` | ✅ | App ID client ID |
| `IBM_APPID_CLIENT_SECRET` | ✅ | App ID client secret |
| `IBM_APPID_OAUTH_SERVER_URL` | ✅ | App ID OAuth server URL |
| `REDIS_URL` | ✅ | Redis connection string |
| `CHROMA_PERSIST_DIRECTORY` | ✅ | Filesystem path for ChromaDB data |
| `CHROMA_COLLECTION_NAME` | ✅ | Name of the ChromaDB collection |
| `MAX_UPLOAD_SIZE_MB` | ❌ | Default: `50` |
| `CHUNK_SIZE` | ❌ | Default: `1000` tokens |
| `CHUNK_OVERLAP` | ❌ | Default: `200` tokens |
| `MAX_CONTEXT_CHUNKS` | ❌ | Default: `5` |
| `JWT_ALGORITHM` | ❌ | Default: `RS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | Default: `60` |
| `LOG_LEVEL` | ❌ | `DEBUG` \| `INFO` \| `WARNING` \| `ERROR` |
| `SENTRY_DSN` | ❌ | Sentry error tracking DSN |

### Frontend (complete list)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend base URL |
| `NEXT_PUBLIC_APP_NAME` | ✅ | Display name in the UI |
| `NEXT_PUBLIC_IBM_APPID_CLIENT_ID` | ✅ | App ID client ID (public) |
| `NEXT_PUBLIC_IBM_APPID_DISCOVERY_ENDPOINT` | ✅ | OIDC discovery URL |
| `NEXT_PUBLIC_IBM_APPID_REDIRECT_URI` | ✅ | OAuth callback URL |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | ❌ | Default: `50` |
| `NEXT_PUBLIC_SUPPORTED_LANGUAGES` | ❌ | Comma-separated language list |
| `NEXT_PUBLIC_POSTHOG_KEY` | ❌ | PostHog analytics key |
| `NEXT_PUBLIC_POSTHOG_HOST` | ❌ | PostHog host URL |

---

## Deploy Frontend to Vercel

### Step 1 — Import the repository

1. Log in to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Connect your GitHub account and select the `edusimplify` repository.
3. Set **Root Directory** to `frontend`.
4. Vercel auto-detects Next.js; confirm the following settings:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Step 2 — Add environment variables

In the Vercel project settings under **Settings → Environment Variables**, add every `NEXT_PUBLIC_*` variable from the table above. Set the **Environment** to **Production**, **Preview**, and **Development** as appropriate.

### Step 3 — Deploy

Click **Deploy**. Vercel will run `npm run build` and publish the result to its CDN. The deployment URL will be shown once complete (e.g. `https://edusimplify.vercel.app`).

### Step 4 — Set up Vercel secrets for GitHub Actions

In your Vercel project settings, note down:
- **Team/Org ID** → `VERCEL_ORG_ID` GitHub Secret
- **Project ID** → `VERCEL_PROJECT_ID` GitHub Secret

Generate a **Vercel Access Token** from [vercel.com/account/tokens](https://vercel.com/account/tokens) → `VERCEL_TOKEN` GitHub Secret.

---

## Deploy Backend to Render

### Step 1 — Create a Web Service

1. Log in to [render.com](https://render.com) and click **New → Web Service**.
2. Connect your GitHub account and select the `edusimplify` repository.
3. Configure:
   - **Name:** `edusimplify-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2`
   - **Plan:** Starter (or higher for production)
   - **Region:** Oregon (US West)

### Step 2 — Add environment variables

In the Render service dashboard under **Environment**, add every backend variable from the table above. Use **Secret** type for API keys.

### Step 3 — Add a Redis instance

1. Click **New → Redis** in the Render dashboard.
2. Name it `edusimplify-redis`, choose the **Starter** plan.
3. Once created, copy the **Internal Redis URL** and set it as `REDIS_URL` in the backend service's environment variables.

### Step 4 — Add a persistent disk (for ChromaDB)

1. In the backend service settings, go to **Disks → Add Disk**.
2. Set:
   - **Mount Path:** `/opt/render/project/src/chroma_db`
   - **Size:** 1 GB (adjust as document volume grows)
3. Set `CHROMA_PERSIST_DIRECTORY=/opt/render/project/src/chroma_db` in environment variables.

### Step 5 — Deploy hook for GitHub Actions

1. In the backend service settings, go to **Settings → Deploy Hook**.
2. Copy the URL and add it as `RENDER_DEPLOY_HOOK_URL` in GitHub Secrets.
3. Generate a Render API key from your Render account settings and add as `RENDER_API_KEY`.
4. Copy the service ID from the service URL (e.g. `srv-xxxxxxxx`) and add as `RENDER_SERVICE_ID`.

---

## GitHub Actions Secrets

Add the following secrets in your GitHub repository under **Settings → Secrets and variables → Actions**:

| Secret Name | Source |
|---|---|
| `VERCEL_TOKEN` | Vercel account tokens page |
| `VERCEL_ORG_ID` | Vercel project settings |
| `VERCEL_PROJECT_ID` | Vercel project settings |
| `RENDER_DEPLOY_HOOK_URL` | Render service → Deploy Hook |
| `RENDER_API_KEY` | Render account settings |
| `RENDER_SERVICE_ID` | Render service URL (e.g. `srv-xxxx`) |
| `IBM_WATSONX_API_KEY` | IBM IAM — used in CI tests |
| `IBM_WATSONX_PROJECT_ID` | IBM watsonx.ai project settings |
| `IBM_COS_API_KEY` | IBM COS service credentials |
| `IBM_COS_INSTANCE_CRN` | IBM COS service credentials |
| `IBM_CLOUDANT_URL` | IBM Cloudant service credentials |
| `IBM_CLOUDANT_API_KEY` | IBM Cloudant service credentials |

> **Tip:** For CI tests you can create a separate IBM COS bucket (`edusimplify-test`) and a separate Cloudant database (`edusimplify-test`) so that the test suite does not touch production data.

---

## Domain Setup

### Custom domain on Vercel

1. In the Vercel project settings, go to **Domains → Add Domain**.
2. Enter your domain (e.g. `edusimplify.ai`).
3. Add the DNS records shown by Vercel at your registrar:
   - `A` record pointing to Vercel's IP, or
   - `CNAME` for `www` pointing to `cname.vercel-dns.com`.
4. Vercel automatically provisions and renews a TLS certificate via Let's Encrypt.

### Custom domain on Render

1. In the backend service settings, go to **Settings → Custom Domains → Add Custom Domain**.
2. Enter your API subdomain (e.g. `api.edusimplify.ai`).
3. Add the `CNAME` record shown by Render at your registrar.
4. Render provisions a TLS certificate automatically.
5. Update `NEXT_PUBLIC_API_URL` in Vercel to `https://api.edusimplify.ai` and redeploy.
6. Update `ALLOWED_ORIGINS` in Render to include `https://edusimplify.ai,https://www.edusimplify.ai`.

---

## Post-Deployment Checklist

After completing all steps above, verify the following:

- [ ] `GET https://api.edusimplify.ai/health` returns `{ "status": "ok" }`
- [ ] All dependency statuses in the health response are `"ok"` (not `"unreachable"`)
- [ ] Frontend loads at `https://edusimplify.ai` without console errors
- [ ] IBM App ID login flow completes and redirects to the dashboard
- [ ] A test PDF can be uploaded successfully
- [ ] A chat message returns a grounded answer referencing the uploaded document
- [ ] Quiz generation returns 5 valid multiple-choice questions
- [ ] GitHub Actions CI pipeline is green on a push to `main`
- [ ] Vercel and Render deployments complete automatically on push to `main`
- [ ] TLS certificates are valid on both domains (check browser padlock)
- [ ] `Strict-Transport-Security` header is present in the frontend response
