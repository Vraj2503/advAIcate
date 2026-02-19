import os
import requests
from jose import jwt, jwk
from jose.utils import base64url_decode
from flask import request, jsonify
from functools import wraps

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
SUPABASE_AUDIENCE = "authenticated"

_jwks_cache = None

SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        res = requests.get(SUPABASE_JWKS_URL, timeout=5)
        res.raise_for_status()
        _jwks_cache = res.json()
    return _jwks_cache




def verify_supabase_token(token: str):
    jwks = get_jwks()

    # Get token header
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")

    # Find matching key in JWKS
    key = None
    for k in jwks["keys"]:
        if k["kid"] == kid:
            key = k
            break

    if key is None:
        raise Exception("Public key not found")

    # Construct public key object (CRITICAL for ES256)
    public_key = jwk.construct(key)

    # Split token
    message, encoded_signature = token.rsplit(".", 1)

    # Decode signature
    decoded_signature = base64url_decode(encoded_signature.encode())

    # Verify signature manually
    if not public_key.verify(message.encode(), decoded_signature):
        raise Exception("Signature verification failed")

    # Now safely read payload (no signature verification here)
    payload = jwt.get_unverified_claims(token)

    # Validate expiration
    import time
    if payload.get("exp") and time.time() > payload["exp"]:
        raise Exception("Token expired")

    # Validate issuer
    if payload.get("iss") != f"{SUPABASE_URL}/auth/v1":
        raise Exception("Invalid issuer")

    # Validate authenticated role
    if payload.get("role") != "authenticated":
        raise Exception("User not authenticated")

    # Validate subject (user id)
    if "sub" not in payload:
        raise Exception("Missing user id")

    return payload


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing Authorization header"}), 401

        token = auth_header.split(" ")[1]

        try:
            payload = verify_supabase_token(token)
        except Exception as e:
            return jsonify({"error": "Invalid token", "details": str(e)}), 401

        request.user = {
            "id": payload["sub"],
            "email": payload.get("email"),
        }

        return f(*args, **kwargs)
    return wrapper
