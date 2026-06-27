#!/bin/bash
set -e

# Usage: ./deploy.sh <PROJECT_ID> <REGION> <IMAGE_URL>

PROJECT_ID=$1
REGION=$2
IMAGE_URL=$3
SERVICE_NAME="advaicate-backend"

if [ -z "$PROJECT_ID" ] || [ -z "$REGION" ] || [ -z "$IMAGE_URL" ]; then
    echo "Usage: ./deploy.sh <PROJECT_ID> <REGION> <IMAGE_URL>"
    exit 1
fi

echo "Deploying $SERVICE_NAME to Cloud Run in $REGION..."

gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_URL \
    --region $REGION \
    --project $PROJECT_ID \
    --cpu 1 \
    --memory 1Gi \
    --min-instances 0 \
    --max-instances 1 \
    --concurrency 6 \
    --timeout 300 \
    --cpu-boost \
    --port 8000 \
    --set-secrets="SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_ANON_KEY=SUPABASE_ANON_KEY:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,GROQ_API_KEY=GROQ_API_KEY:latest,ALLOWED_ORIGINS=ALLOWED_ORIGINS:latest" \
    --allow-unauthenticated

echo "Deployment complete."
