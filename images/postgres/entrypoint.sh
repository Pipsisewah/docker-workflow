#!/bin/bash
set -e

# Start PostgreSQL server in the background
docker-entrypoint.sh postgres &

# Wait for PostgreSQL to start
until pg_isready -h localhost; do
  sleep 1
done

# Run the additional commands
psql postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/postgres -c "CREATE DATABASE assetdb"
psql postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/postgres -c "ALTER DATABASE assetdb SET TIMEZONE to 'UTC'"

# Bring PostgreSQL server to the foreground
wait
