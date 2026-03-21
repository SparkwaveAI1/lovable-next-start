#!/bin/bash
# Pre-deployment template validation gate
# Run: scripts/check-templates.sh
# 
# Validates that all required templates exist in the Supabase template system
# before allowing deployment to proceed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATES_JSON="$PROJECT_ROOT/supabase/functions/lib/template-sets.json"

if [ ! -f "$TEMPLATES_JSON" ]; then
  echo "ERROR: template-sets.json not found at $TEMPLATES_JSON"
  exit 1
fi

echo "[CHECK-TEMPLATES] Validating template system..."

# Extract all template names from nested JSON structure
# template-sets.json: { "lead_type": { "intro": "name", "day3": "name", ... }, ... }
TEMPLATES=$(node -e "
  const ts = require('$TEMPLATES_JSON');
  const all = [];
  for(const lead_type in ts) {
    for(const step in ts[lead_type]) {
      all.push(ts[lead_type][step]);
    }
  }
  console.log(all.join('\n'));
" | sort -u)

echo "[CHECK-TEMPLATES] Checking ${TEMPLATES} templates..."

# If DB_HOST is not set, skip DB check (useful for local development)
if [ -z "$DB_HOST" ]; then
  echo "[CHECK-TEMPLATES] ⚠️  DB_HOST not set. Skipping database validation."
  echo "[CHECK-TEMPLATES] Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME to enable validation."
  exit 0
fi

MISSING=()
while IFS= read -r template; do
  [ -z "$template" ] && continue
  
  COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM templates WHERE template_name='$template';" 2>/dev/null || echo "0")
  
  if [ "$COUNT" -eq 0 ]; then
    MISSING+=("$template")
    echo "  ✗ $template (not found)"
  else
    echo "  ✓ $template"
  fi
done <<< "$TEMPLATES"

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "[CHECK-TEMPLATES] ERROR: Missing templates:"
  for t in "${MISSING[@]}"; do
    echo "  - $t"
  done
  exit 1
fi

echo ""
echo "[CHECK-TEMPLATES] ✅ All templates validated"
