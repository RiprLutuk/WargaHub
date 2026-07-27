#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

usage() {
  cat <<'USAGE'
Usage:
  backup.sh --database-url URL --uploads-dir DIR --destination DIR

Creates a new timestamped backup directory. Existing backups are never overwritten.
The destination directory must already exist and must not overlap the uploads tree.
USAGE
}

die() {
  printf 'backup: %s\n' "$*" >&2
  exit 1
}

database_url=''
uploads_dir=''
destination=''

while (($# > 0)); do
  case "$1" in
    --database-url)
      (($# >= 2)) || die '--database-url requires a value'
      database_url=$2
      shift 2
      ;;
    --uploads-dir)
      (($# >= 2)) || die '--uploads-dir requires a value'
      uploads_dir=$2
      shift 2
      ;;
    --destination)
      (($# >= 2)) || die '--destination requires a value'
      destination=$2
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
[[ -n "$uploads_dir" ]] || die '--uploads-dir is required'
[[ -n "$destination" ]] || die '--destination is required'
[[ "$uploads_dir" != '/' ]] || die 'uploads directory may not be the filesystem root'
[[ "$destination" != '/' ]] || die 'destination may not be the filesystem root'
[[ -d "$uploads_dir" ]] || die "uploads directory does not exist: $uploads_dir"
[[ ! -L "$uploads_dir" ]] || die 'uploads directory may not be a symbolic link'
[[ -d "$destination" ]] || die "destination directory does not exist: $destination"
[[ ! -L "$destination" ]] || die 'destination may not be a symbolic link'

uploads_path=$(cd -- "$uploads_dir" && pwd -P)
destination_path=$(cd -- "$destination" && pwd -P)
if [[ "$uploads_path" == "$destination_path" ||
      "$uploads_path" == "$destination_path"/* ||
      "$destination_path" == "$uploads_path"/* ]]; then
  die 'destination and uploads directories may not overlap'
fi

command -v pg_dump >/dev/null 2>&1 || die 'pg_dump is required'
command -v tar >/dev/null 2>&1 || die 'tar is required'
command -v find >/dev/null 2>&1 || die 'find is required'
if [[ -n "$(find -- "$uploads_path" ! -type d ! -type f -print -quit)" ]]; then
  die 'uploads directory contains a link or special file; only regular files and directories may be archived'
fi
if command -v sha256sum >/dev/null 2>&1; then
  checksum_command=(sha256sum)
elif command -v shasum >/dev/null 2>&1; then
  checksum_command=(shasum -a 256)
else
  die 'sha256sum or shasum is required'
fi

timestamp=$(date -u '+%Y%m%dT%H%M%SZ')
backup_dir="${destination_path%/}/wargahub-${timestamp}"
[[ ! -e "$backup_dir" ]] || die "backup already exists: $backup_dir"
mkdir -- "$backup_dir"
touch "$backup_dir/INCOMPLETE"

printf 'Creating database dump...\n'
pg_dump \
  --dbname="$database_url" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-privileges \
  --file="$backup_dir/database.dump"

printf 'Archiving uploads...\n'
tar --create --gzip --file="$backup_dir/uploads.tar.gz" --directory="$uploads_path" .

{
  printf 'format_version=1\n'
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'database_format=postgres_custom\n'
  printf 'uploads_format=tar_gzip\n'
} >"$backup_dir/manifest.txt"

(
  cd "$backup_dir"
  "${checksum_command[@]}" database.dump uploads.tar.gz manifest.txt >SHA256SUMS
)

rm -f -- "$backup_dir/INCOMPLETE"
printf 'Backup created: %s\n' "$backup_dir"
printf 'Encrypt and copy this directory to separate storage before considering the backup complete.\n'
