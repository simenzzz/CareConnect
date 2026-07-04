#!/bin/sh
set -eu

required_vars="
ENABLE_DEV_SEED
DEV_SEED_FIREBASE_UID_CUSTOMER_DEMO
DEV_SEED_FIREBASE_UID_SITTER_BABY
DEV_SEED_FIREBASE_UID_SITTER_PET
DEV_SEED_FIREBASE_UID_SITTER_BOTH
DEV_SEED_FIREBASE_UID_SITTER_UNVERIFIED
"

if [ "${ENABLE_DEV_SEED:-}" != "true" ]; then
  echo "CareConnect dev seed skipped. Set ENABLE_DEV_SEED=true and all DEV_SEED_FIREBASE_UID_* vars to seed demo users."
  exit 0
fi

if [ "${NODE_ENV:-}" != "development" ]; then
  echo "CareConnect dev seed skipped. NODE_ENV must be development."
  exit 0
fi

missing_vars=""
for var_name in $required_vars; do
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    missing_vars="$missing_vars $var_name"
  fi
done

if [ -n "$missing_vars" ]; then
  echo "CareConnect dev seed skipped. Set all DEV_SEED_FIREBASE_UID_* vars to seed demo users."
  echo "Missing:$missing_vars"
  exit 0
fi

echo "CareConnect dev seed running with Firebase UID values from the container environment."

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v customer_uid="$DEV_SEED_FIREBASE_UID_CUSTOMER_DEMO" \
  -v sitter_baby_uid="$DEV_SEED_FIREBASE_UID_SITTER_BABY" \
  -v sitter_pet_uid="$DEV_SEED_FIREBASE_UID_SITTER_PET" \
  -v sitter_both_uid="$DEV_SEED_FIREBASE_UID_SITTER_BOTH" \
  -v sitter_unverified_uid="$DEV_SEED_FIREBASE_UID_SITTER_UNVERIFIED" \
  -f /dev-seed/dev_seed.sql
