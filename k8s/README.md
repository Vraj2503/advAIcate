# Kubernetes Manifests (Reference Only)

> **IMPORTANT**: The files in this `/k8s` directory are provided for reference and future scaling only. 
> They do **not** represent the live deployment path.

The current active production deployment architecture is:
- **Backend**: Google Cloud Run (Serverless) deployed via Artifact Registry.
- **Frontend**: Vercel (Serverless Edge).

Do not use `kubectl apply` for deploying updates unless you are migrating away from Cloud Run to a dedicated GKE/Kubernetes cluster.
