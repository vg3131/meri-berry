#!/bin/sh
set -e

echo "Running database migrations..."
node dist/db/runMigrations.js

echo "Starting server..."
exec node dist/server.js
