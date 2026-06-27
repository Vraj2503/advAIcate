# Cloud Run Deployment Guide

This repository deploys the backend to Google Cloud Run and the frontend to Vercel. This guide outlines the steps required for Google Cloud.

## GCP One-Time Setup
1. **Enable APIs**
   Enable the following APIs in your GCP project:
   - `run.googleapis.com` (Cloud Run API)
   - `artifactregistry.googleapis.com` (Artifact Registry API)
   - `secretmanager.googleapis.com` (Secret Manager API)
   - `iamcredentials.googleapis.com` (IAM Service Account Credentials API)

2. **Create Artifact Registry Repository**
   Create a Docker repository in Artifact Registry. Note the location (e.g., `us-central1-docker.pkg.dev/PROJECT_ID/REPO_NAME`).

3. **Set Up Secret Manager**
   Create the following secrets in GCP Secret Manager and populate them with the correct values:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `ALLOWED_ORIGINS` (comma-separated, e.g., `https://your-vercel-domain.com,http://localhost:3000`)

4. **Service Accounts and IAM Roles**
   Create a runtime service account (e.g., `backend-runtime-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com`). Grant it:
   - `roles/secretmanager.secretAccessor` (to read secrets)

5. **GitHub Actions Authentication**
   It is recommended to use **Workload Identity Federation (WIF)** instead of long-lived JSON keys.
   - Create a WIF Pool and Provider for GitHub.
   - Bind the GitHub repo to a deployment service account.
   - Grant the deployment service account:
     - `roles/run.developer`
     - `roles/iam.serviceAccountUser` (to impersonate the runtime SA)
     - `roles/artifactregistry.writer`

## Fallback Authentication (JSON Key)
If WIF is not feasible, use a standard JSON key.
1. Create a service account with the same roles as above (`roles/run.developer`, `roles/iam.serviceAccountUser`, `roles/artifactregistry.writer`).
2. Generate a JSON key and add it to your GitHub Secrets as `GCP_SA_KEY`.

## GitHub Actions Secrets
To run the CD workflow (`.github/workflows/cd.yml`), configure these GitHub Secrets:
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_WIF_PROVIDER` (if using WIF)
- `GCP_WIF_SA_EMAIL` (if using WIF)
- `GCP_SA_KEY` (if using JSON fallback)
- `ARTIFACT_REGISTRY_REPO` (e.g., `us-central1-docker.pkg.dev/YOUR_PROJECT_ID/YOUR_REPO_NAME`)
- `BACKEND_PROD_URL` (Required for Supabase keep-alive cron, e.g., `https://advaicate-backend-xxxxx.run.app`)

Note: The ~120MB backend image stored in Artifact Registry incurs a negligible storage cost (~$0.10/mo), which fits within the $0/mo cost target logic.
