#!/usr/bin/env bash
#
# Sends one test lead to a webhook in the same shape the live site sends: same
# Content-Type, same field names, same flat encoding. It is deliberately a SUPERSET —
# it always fills business and note, which the real forms send only when the visitor
# gives them — so one run exercises every field the receiver can ever be handed.
#
# Keep the field list below in step with leadSenderScript() in scripts/build.mjs. It
# drifted once already — form_name and page shipped without being added here — and a
# test payload that quietly differs from the real one is worse than no test at all.
#
# Why this exists: the sandbox the site was built in has no network route to
# hooks.zapier.com, so the payload could be proven against a local receiver but not
# against the real endpoint. Zapier's reply does not say how it parsed the fields
# either — so after running this, open the Zap's task history and check that `name`,
# `phone` and `email` arrived as SEPARATE FIELDS rather than one blob. That is the
# one thing this cannot tell you.
#
#   ./scripts/test-webhook.sh https://hooks.zapier.com/hooks/catch/XXXXXXX/YYYYYYY/
#
# The lead is labelled "TEST — ignore" so it is obvious in the Zap history. If the Zap
# emails someone or writes to a CRM, that action WILL fire — pause the Zap first if
# you would rather it did not.
#
# What this DOES tell you, and it is the useful half: whether the endpoint accepts the
# payload at all. A 200 here with nothing arriving from the live site means the browser
# never sent — load the page with ?leaddebug=1 and it will say which gate stopped it.
# A non-200 here means the problem is the endpoint, and no change to the site can fix it.

set -euo pipefail

URL="${1:-${LEAD_WEBHOOK_URL:-}}"
if [ -z "$URL" ]; then
  echo "usage: $0 <webhook-url>    (or set LEAD_WEBHOOK_URL)" >&2
  exit 2
fi

echo "POSTing a test lead to ${URL%%\?*}"
echo

curl -sS -X POST "$URL" \
  -H 'Content-Type: application/x-www-form-urlencoded;charset=UTF-8' \
  --data-urlencode 'name=TEST — ignore' \
  --data-urlencode 'phone=(310) 555-0199' \
  --data-urlencode 'email=test@example.invalid' \
  --data-urlencode 'business=Webhook Test' \
  --data-urlencode 'form=end-of-page' \
  --data-urlencode 'form_name=Form 2 (bottom)' \
  --data-urlencode 'page=main' \
  --data-urlencode 'note=Sent by scripts/test-webhook.sh — safe to delete.' \
  --data-urlencode "submittedAt=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
  --data-urlencode 'pageUrl=https://example.com/?utm_source=test' \
  --data-urlencode 'utm_source=test' \
  --data-urlencode 'utm_medium=cli' \
  --data-urlencode 'utm_campaign=webhook_check' \
  -w '\n\nHTTP %{http_code} in %{time_total}s\n'

cat <<'NOTE'

A 200 means it arrived. It does NOT mean it parsed correctly.
Now open the Zap's task history and confirm you see separate fields:

    name        TEST — ignore
    phone       (310) 555-0199
    email       test@example.invalid
    form        end-of-page
    form_name   Form 2 (bottom)
    page        main

If instead you see one field holding the whole string, tell whoever maintains
this repo — the encoding in leadSenderScript() (scripts/build.mjs) is the knob.
NOTE
