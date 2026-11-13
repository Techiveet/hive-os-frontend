#!/bin/sh
set -eu

APP_DIR=/app

if [ ! -f "$APP_DIR/package.json" ]; then
  echo "package.json not found in $APP_DIR" >&2
  exit 1
fi

NODE_ENV="${NODE_ENV:-production}"

if [ "$NODE_ENV" = "production" ]; then
  exec node server.js
else
  cd "$APP_DIR"

  NODE_MODULES_DIR="$APP_DIR/node_modules"
  LOCKFILE="$APP_DIR/package-lock.json"
  STAMP_FILE="$NODE_MODULES_DIR/.package-lock.sha256"

  mkdir -p "$NODE_MODULES_DIR"

  current_hash="$(sha256sum "$LOCKFILE" | awk '{ print $1 }')"
  stored_hash=""

  if [ -f "$STAMP_FILE" ]; then
    stored_hash="$(cat "$STAMP_FILE")"
  fi

  needs_install=0

  if [ ! -x "$NODE_MODULES_DIR/.bin/next" ]; then
    needs_install=1
  fi

  if [ "$stored_hash" != "$current_hash" ]; then
    needs_install=1
  fi

  if [ "$needs_install" -eq 1 ]; then
    echo "Refreshing frontend dependencies..."
    find "$NODE_MODULES_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} \;
    npm ci --legacy-peer-deps
    printf '%s' "$current_hash" > "$STAMP_FILE"
  fi

  # Next.js dev cache policy
  #
  # `next dev` writes its build output to .next/dev. This used to be deleted on
  # every start; now it is kept and only discarded when it cannot be trusted:
  #   * a different Next.js version compiled it,
  #   * a different Node.js version compiled it,
  #   * dependencies changed (npm ci ran above).
  # NEXT_DEV_CACHE_RESET=always forces the old wipe-on-every-start behaviour;
  # the default ("auto") keeps the cache while the signature below is unchanged.
  #
  # Measured caveat, so this is not expected to deliver more than it can: keeping
  # .next/dev does not by itself make a restarted dev server warm. Next 16 with
  # `--webpack` rewrote the whole dev build on start regardless (0 of 177
  # compiled files were reused, and the first request to / reported next.js:
  # 36.5s), because webpack's dev module graph lives in memory, not on disk. What
  # this policy buys is that the container no longer destroys build output a
  # cache could reuse — which matters for on-disk caches such as Turbopack's, or
  # a webpack filesystem cache if one is enabled.
  NEXT_VERSION="$(node -e "process.stdout.write(require('$NODE_MODULES_DIR/next/package.json').version)" 2>/dev/null || true)"
  [ -n "$NEXT_VERSION" ] || NEXT_VERSION="unknown"

  CACHE_SIGNATURE="next=$NEXT_VERSION node=$(node -v) lock=$current_hash"
  # Deliberately outside .next/dev: `next dev` prunes unrecognised files from
  # its own distDir (measured: a stamp written there vanished within 5s of the
  # dev server starting), so the stamp has to live one level up.
  SIGNATURE_FILE="$APP_DIR/.next/.docker-cache-signature"
  STORED_SIGNATURE=""

  if [ -f "$SIGNATURE_FILE" ]; then
    STORED_SIGNATURE="$(cat "$SIGNATURE_FILE")"
  fi

  reset_cache=0

  case "${NEXT_DEV_CACHE_RESET:-auto}" in
    always | 1 | true | yes) reset_cache=1 ;;
  esac

  if [ "$STORED_SIGNATURE" != "$CACHE_SIGNATURE" ]; then
    reset_cache=1
  fi

  if [ "$reset_cache" -eq 1 ]; then
    echo "Resetting Next.js dev cache (toolchain/dependencies changed, or forced)..."
    rm -rf \
      "$APP_DIR/.next/dev" \
      "$APP_DIR/.next/cache/turbopack" \
      "$APP_DIR/.next/turbopack" \
      "$APP_DIR/.next-dev"
    mkdir -p "$APP_DIR/.next"
    printf '%s' "$CACHE_SIGNATURE" > "$SIGNATURE_FILE"
  else
    echo "Keeping Next.js dev cache ($CACHE_SIGNATURE)."
  fi

  # Dev bundler. Turbopack (Next 16's default) compiles a module page in a few
  # seconds where webpack took 24-107s, and keeps its build cache on disk in
  # .next/dev, so pages stay compiled across navigation and container restarts.
  # NEXT_DEV_BUNDLER=webpack restores the previous bundler if ever needed.
  case "${NEXT_DEV_BUNDLER:-turbopack}" in
    webpack)
      echo "Starting next dev with webpack (NEXT_DEV_BUNDLER=webpack)."
      exec npm run dev -- --webpack
      ;;
    *)
      echo "Starting next dev with Turbopack."
      exec npm run dev
      ;;
  esac
fi