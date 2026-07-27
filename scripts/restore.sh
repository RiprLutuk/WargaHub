#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

usage() {
  cat <<'USAGE'
Usage:
  restore.sh --database-url URL --dump FILE --uploads-archive FILE \
    --uploads-destination DIR --confirm RESTORE_WARGAHUB [--checksum-file FILE]

The target database must be empty and the uploads destination must not exist or
must be empty. This script never drops a database or removes an uploads directory.
USAGE
}

die() {
  printf 'restore: %s\n' "$*" >&2
  exit 1
}

database_url=''
dump_file=''
uploads_archive=''
uploads_destination=''
checksum_file=''
confirmation=''

while (($# > 0)); do
  case "$1" in
    --database-url)
      (($# >= 2)) || die '--database-url requires a value'
      database_url=$2
      shift 2
      ;;
    --dump)
      (($# >= 2)) || die '--dump requires a value'
      dump_file=$2
      shift 2
      ;;
    --uploads-archive)
      (($# >= 2)) || die '--uploads-archive requires a value'
      uploads_archive=$2
      shift 2
      ;;
    --uploads-destination)
      (($# >= 2)) || die '--uploads-destination requires a value'
      uploads_destination=$2
      shift 2
      ;;
    --checksum-file)
      (($# >= 2)) || die '--checksum-file requires a value'
      checksum_file=$2
      shift 2
      ;;
    --confirm)
      (($# >= 2)) || die '--confirm requires a value'
      confirmation=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[[ -n "$database_url" ]] || die '--database-url is required'
[[ -f "$dump_file" ]] || die "dump file does not exist: $dump_file"
[[ -f "$uploads_archive" ]] || die "uploads archive does not exist: $uploads_archive"
[[ -n "$uploads_destination" ]] || die '--uploads-destination is required'
[[ "$uploads_destination" != '/' ]] || die 'uploads destination may not be the filesystem root'
[[ "$confirmation" == 'RESTORE_WARGAHUB' ]] || die 'pass --confirm RESTORE_WARGAHUB to authorize the restore'
[[ ! -L "$uploads_destination" ]] || die 'uploads destination may not be a symbolic link'

command -v pg_restore >/dev/null 2>&1 || die 'pg_restore is required'
command -v psql >/dev/null 2>&1 || die 'psql is required to verify the target database is empty'
command -v tar >/dev/null 2>&1 || die 'tar is required'
command -v find >/dev/null 2>&1 || die 'find is required'

if [[ -n "$checksum_file" ]]; then
  [[ -f "$checksum_file" ]] || die "checksum file does not exist: $checksum_file"
  checksum_directory=$(cd "$(dirname "$checksum_file")" && pwd -P)
  checksum_name=$(basename "$checksum_file")
  [[ "$checksum_name" == 'SHA256SUMS' ]] || die 'checksum file must be named SHA256SUMS'
  dump_directory=$(cd "$(dirname "$dump_file")" && pwd -P)
  archive_directory=$(cd "$(dirname "$uploads_archive")" && pwd -P)
  [[ "$dump_directory" == "$checksum_directory" ]] || die 'dump and checksum file must be in the same directory'
  [[ "$archive_directory" == "$checksum_directory" ]] || die 'uploads archive and checksum file must be in the same directory'
  [[ "$(basename "$dump_file")" == 'database.dump' ]] || die 'checksummed dump must be named database.dump'
  [[ "$(basename "$uploads_archive")" == 'uploads.tar.gz' ]] || die 'checksummed uploads archive must be named uploads.tar.gz'
  if ! awk '
    NF != 2 { invalid = 1; next }
    length($1) != 64 { invalid = 1; next }
    $2 != "database.dump" && $2 != "uploads.tar.gz" && $2 != "manifest.txt" { invalid = 1; next }
    { seen[$2]++ }
    END {
      exit invalid || !(seen["database.dump"] == 1 && seen["uploads.tar.gz"] == 1 && seen["manifest.txt"] == 1)
    }
  ' "$checksum_file"; then
    die 'checksum file must contain exactly the three expected backup files'
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$checksum_directory" && sha256sum --check "$checksum_name")
  elif command -v shasum >/dev/null 2>&1; then
    (cd "$checksum_directory" && shasum -a 256 --check "$checksum_name")
  else
    die 'sha256sum or shasum is required to verify checksums'
  fi
else
  printf 'restore: warning: no --checksum-file supplied; integrity was not verified\n' >&2
fi

pg_restore --list -- "$dump_file" >/dev/null
tar --list --gzip --file="$uploads_archive" >/dev/null
if tar --list --gzip --file="$uploads_archive" | awk '
  /^\// { unsafe = 1 }
  /(^|\/)\.\.(\/|$)/ { unsafe = 1 }
  END { exit unsafe ? 0 : 1 }
'; then
  die 'uploads archive contains an unsafe path'
fi
if tar --list --verbose --gzip --file="$uploads_archive" | awk '
  substr($1, 1, 1) != "d" && substr($1, 1, 1) != "-" { unsafe = 1 }
  END { exit unsafe ? 0 : 1 }
'; then
  die 'uploads archive contains a link or special file'
fi

if [[ -d "$uploads_destination" ]]; then
  if [[ -n "$(find -- "$uploads_destination" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    die 'uploads destination must be empty'
  fi
elif [[ -e "$uploads_destination" ]]; then
  die 'uploads destination exists and is not a directory'
fi
mkdir -p -- "$uploads_destination"

target_object_count=$(
  psql \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --set=ON_ERROR_STOP=1 \
    --dbname="$database_url" \
    --command="
      WITH user_namespaces AS (
        SELECT oid, nspname
        FROM pg_namespace
        WHERE nspname NOT IN ('pg_catalog', 'information_schema')
          AND nspname NOT LIKE 'pg_toast%'
          AND nspname NOT LIKE 'pg_temp_%'
      ),
      user_objects AS (
        SELECT c.oid
        FROM pg_class c
        JOIN user_namespaces n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
        UNION ALL
        SELECT p.oid
        FROM pg_proc p
        JOIN user_namespaces n ON n.oid = p.pronamespace
        UNION ALL
        SELECT t.oid
        FROM pg_type t
        JOIN user_namespaces n ON n.oid = t.typnamespace
        WHERE t.typtype IN ('d', 'e', 'r', 'm')
        UNION ALL
        SELECT n.oid
        FROM user_namespaces n
        WHERE n.nspname <> 'public'
      )
      SELECT count(*) FROM user_objects;
    "
)
[[ "$target_object_count" =~ ^[[:space:]]*0[[:space:]]*$ ]] ||
  die "target database is not empty (${target_object_count//[[:space:]]/} user objects found)"

printf 'Restoring database into the explicitly supplied target...\n'
pg_restore \
  --dbname="$database_url" \
  --format=custom \
  --exit-on-error \
  --single-transaction \
  --no-owner \
  --no-privileges \
  -- "$dump_file"

tar --extract --gzip --file="$uploads_archive" --directory="$uploads_destination" --no-same-owner
printf 'Restore completed. Validate /ready, login, file access, and business totals before reopening traffic.\n'
