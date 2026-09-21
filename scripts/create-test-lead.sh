#!/usr/bin/env bash
# Replace a form's Meta test lead with one carrying your own answers.
# Meta keeps one test lead per form, so any existing one is deleted first.
#
# Usage:
#   META_PAGE_TOKEN=<page token> META_FORM_ID=<form id> \
#     scripts/create-test-lead.sh "<full name>" <email> <phone> [question_key=answer ...]
#
# Extra arguments fill custom questions by their key, as shown in the
# "Question details" field of the form in Twenty.
set -euo pipefail

if [[ -z "${META_PAGE_TOKEN:-}" || -z "${META_FORM_ID:-}" || $# -lt 3 ]]; then
  echo 'Usage: META_PAGE_TOKEN=<page token> META_FORM_ID=<form id> scripts/create-test-lead.sh "<full name>" <email> <phone> [question_key=answer ...]'
  exit 1
fi

GRAPH=https://graph.facebook.com/v25.0
AUTH="Authorization: Bearer $META_PAGE_TOKEN"

FIELD_DATA=$(node -e '
const [name, email, phone, ...custom] = process.argv.slice(1);
const answers = [
  { name: "full_name", values: [name] },
  { name: "email", values: [email] },
  { name: "phone_number", values: [phone] },
  ...custom.map((pair) => {
    const index = pair.indexOf("=");
    return { name: pair.slice(0, index), values: [pair.slice(index + 1)] };
  }),
];
console.log(JSON.stringify(answers));' "$@")

EXISTING=$(curl -s -H "$AUTH" "$GRAPH/$META_FORM_ID/test_leads?fields=id" |
  node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>console.log((JSON.parse(s).data??[]).map((l)=>l.id).join(" ")))')

for id in $EXISTING; do
  curl -s -X DELETE -H "$AUTH" "$GRAPH/$id" >/dev/null
done

curl -s -X POST -H "$AUTH" --data-urlencode "field_data=$FIELD_DATA" "$GRAPH/$META_FORM_ID/test_leads"
echo
