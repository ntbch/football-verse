#!/bin/sh
set -eu

psql --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=ingestion_db="$INGESTION_DB_NAME" \
  --set=ingestion_user="$INGESTION_DB_USER" \
  --set=ingestion_password="$INGESTION_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'ingestion_user', :'ingestion_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'ingestion_user')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'ingestion_db', :'ingestion_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'ingestion_db')
\gexec
SQL
