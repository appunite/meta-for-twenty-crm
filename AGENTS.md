# Meta Leads

A Twenty CRM app that imports leads from Meta Lead Ads (Facebook and Instagram instant forms) into Twenty. Each submission becomes a `MetaLead` record linked to a matching or newly created Person. Published to npm as `meta-leads`.

- `README.md` is the marketplace listing. The build copies it into the manifest's `aboutDescription`, so write it for customers, not developers.
- `SETUP.md` is the setup guide for non-technical operators: click paths in Meta's web tools, no code.

## Model

- Bring your own Meta app. Each workspace connects its own Meta app and one Facebook Page. There is no central app or relay; data goes straight from Meta to the workspace.
- One Page per workspace. A Page access token only covers its own Page.
- Person gets no extra columns, only the `metaLeads` relation. Opportunities are not created.

## Flow

```
Meta --POST leadgen--> meta-webhook-receive (public route /s/meta/leadgen)
                         verify X-Hub-Signature-256 against the raw body
                         enqueue one meta-process-lead job per lead (jobId = leadgenId)
Meta --GET verify----> meta-webhook-verify: check hub.verify_token, echo hub.challenge

meta-process-lead (queued job)
  skip if the MetaLead is already PROCESSED
  GET /{leadgen_id} with the Page token
  map field_data, find Person by email then phone, create one if missing
  upsert MetaLead as PROCESSED, or FAILED with the error and the raw answers
  Meta rate limits and temporary errors throw RetryableLogicFunctionError

meta-reconcile-leads (cron, hourly) and meta-backfill-leads (manual)
  sync the Page's forms into MetaLeadForm
  for each enabled form: GET /{form_id}/leads since the cursor, same path as process-lead
```

Webhook, reconcile and backfill feed one idempotent pipeline keyed on `leadgenId`. Reconcile starts one hour before each form's `lastSyncedAt` cursor and never further back than 90 days, which is how long Meta keeps lead data. Backfill ignores the cursor.

`meta-connection-status` (GET `/s/meta/status`, auth required) reports which variables are set and whether the Page is reachable, subscribed to `leadgen` and has forms. The Status page (`src/front-components/main-page.tsx`) renders it together with the callback URL and recent failures.

## Code layout

```
src/
  application-config.ts        app metadata and the four application variables
  default-role.ts              Person read/update, MetaLead and MetaLeadForm
  constants/                   universal identifiers, route paths
  objects/                     MetaLead, MetaLeadForm
  fields/                      Person.metaLeads relation
  logic-functions/             thin handlers that wire clients to utils
  meta-client/                 the only code that calls graph.facebook.com
  twenty-client/               repositories over CoreApiClient
  utils/                       pure logic: signature, parsing, mapping, processing, reconcile
  front-components/            Status page
  navigation-menu-items/       "Lead Ads" sidebar folder: Status, Meta Leads, Lead forms
  page-layouts/                Status page layout
scripts/create-test-lead.sh    creates a readable Meta test lead through the Graph API
```

Two seams keep the logic testable: `MetaGraphClient` (`meta-client/meta-graph-client.ts`) and `LeadRepository` / `FormRepository` (`twenty-client/`). Unit tests use the in-memory repositories in `src/__tests__/utils/` and stub the graph client. Logic functions stay thin; put behaviour in `utils/` with a spec next to it in `utils/__tests__/`.

## Configuration

Application variables, set per workspace in Settings, Applications, Meta Leads:

| Key | Secret | Use |
|---|---|---|
| `META_APP_SECRET` | yes | HMAC key for webhook signatures |
| `META_VERIFY_TOKEN` | yes | Webhook verification handshake |
| `META_PAGE_ACCESS_TOKEN` | yes | Graph API calls. Without it every call fails with "not configured" |
| `META_PAGE_ID` | no | The Page whose forms are synced |

## Behaviour worth knowing

- Phones: Twenty stores calling code, national number and country separately, so a filter on the full `+48...` string never matches. `normalizePhone` (libphonenumber-js) splits the number for both lookup and creation. A number that cannot be parsed, or has no `+` prefix, is left off the Person; the raw answer stays in `fieldData`.
- Emails match case-insensitively (`ilike` with `%`, `_` and `\` escaped), because Twenty stores them as typed. Only `primaryEmail` and the primary phone are matched.
- A failure never overwrites a MetaLead that is already PROCESSED; the run reports SKIPPED instead. When the webhook job and reconcile race on a new lead, the losing run may still leave behind a Person it created.
- Standard Meta keys (`full_name`, `first_name`, `last_name`, `email`, `phone_number`, `job_title`) map to Person fields. Every answer, standard or custom, is kept on the MetaLead in `fieldData`.
- `MetaLeadForm.formId` is unique across soft-deleted rows. A form deleted in Twenty is skipped by form sync, not recreated; restoring it in Twenty brings it back.
- `formName` on a MetaLead comes from the synced MetaLeadForm, so a lead that arrives before the first form sync has none.
- Leads created in Meta's Lead Ads Testing Tool cannot be read by any app (error 100, subcode 33). Test through `POST /{form_id}/test_leads` instead, which `scripts/create-test-lead.sh` does.
- A Meta app in Development mode receives no production webhooks and cannot read leads. It has to be switched to Live.
- `RestApiClient` treats a path starting with `/s/` as a marker for the functions base URL, not a literal path. Keep the route paths fixed. Behind a tunnel the Status page shows the local callback URL, not the tunnel one.
- Not implemented yet: `isTest` is never set, `MetaLeadForm.fieldMapping` is defined but unused, there is no default phone country.

## Rules

- Universal identifiers are permanent. Removing an object, field or variable in a later version destroys its data in every workspace. Add new ones; do not reuse or delete.
- Twenty is pinned to 2.39.0: `twenty-sdk`, `twenty-client-sdk`, and the `twentycrm/twenty-app-dev:v2.39.0` image. npm `latest` is newer, so always pass explicit versions.
- `keywords: ["twenty-app"]` in `package.json` must stay, or the marketplace never finds the app.
- Minimal comments. Plain prose in docs.

## Commands

```
yarn lint
yarn typecheck
yarn test:unit        unit tests, no server needed
yarn test             integration tests against a running Twenty server
yarn twenty dev       sync the app to the default remote and watch
```

Integration tests (`*.integration-test.ts`) sync and install the app on `TWENTY_API_URL` (default `http://localhost:2020`) and uninstall it on teardown, which wipes its application variables. `src/__tests__/global-setup.ts` also overwrites `~/.twenty/config.test.json`. Run them only against a disposable server, or with `HOME` pointed at a scratch directory.

## Twenty app documentation

- Getting started:
  - https://docs.twenty.com/developers/extend/apps/getting-started/quick-start.md
  - https://docs.twenty.com/developers/extend/apps/getting-started/concepts.md
  - https://docs.twenty.com/developers/extend/apps/getting-started/project-structure.md
  - https://docs.twenty.com/developers/extend/apps/getting-started/local-server.md
  - https://docs.twenty.com/developers/extend/apps/getting-started/scaffolding.md
  - https://docs.twenty.com/developers/extend/apps/getting-started/troubleshooting.md
- Config:
  - https://docs.twenty.com/developers/extend/apps/config/overview.md
  - https://docs.twenty.com/developers/extend/apps/config/application.md
  - https://docs.twenty.com/developers/extend/apps/config/roles.md
  - https://docs.twenty.com/developers/extend/apps/config/install-hooks.md
  - https://docs.twenty.com/developers/extend/apps/config/public-assets.md
- Data:
  - https://docs.twenty.com/developers/extend/apps/data/overview.md
  - https://docs.twenty.com/developers/extend/apps/data/objects.md
  - https://docs.twenty.com/developers/extend/apps/data/extending-objects.md
  - https://docs.twenty.com/developers/extend/apps/data/relations.md
- Logic:
  - https://docs.twenty.com/developers/extend/apps/logic/overview.md
  - https://docs.twenty.com/developers/extend/apps/logic/logic-functions.md
  - https://docs.twenty.com/developers/extend/apps/logic/skills-and-agents.md
  - https://docs.twenty.com/developers/extend/apps/logic/connections.md
- Layout:
  - https://docs.twenty.com/developers/extend/apps/layout/overview.md
  - https://docs.twenty.com/developers/extend/apps/layout/views.md
  - https://docs.twenty.com/developers/extend/apps/layout/navigation-menu-items.md
  - https://docs.twenty.com/developers/extend/apps/layout/page-layouts.md
  - https://docs.twenty.com/developers/extend/apps/layout/front-components.md
  - https://docs.twenty.com/developers/extend/apps/layout/command-menu-items.md
- Operations:
  - https://docs.twenty.com/developers/extend/apps/operations/overview.md
  - https://docs.twenty.com/developers/extend/apps/operations/cli.md
  - https://docs.twenty.com/developers/extend/apps/operations/testing.md
  - https://docs.twenty.com/developers/extend/apps/operations/publishing.md
- Rich app example: https://github.com/twentyhq/twenty/tree/main/packages/twenty-apps/examples/postcard

### SDK conventions

- All generated UUIDs must be valid UUID v4.
- Pitfall: creating a view without an associated navigation menu item. This will make the view available on the left sidebar.
- Front components should fit their widget's fixed height and width instead of scrolling, unless they are meant for a canvas tab.
- Create new entities with `yarn twenty dev:add <type>` (object, field, logicFunction, frontComponent, role, skill, agent, view, navigationMenuItem, pageLayout, pageLayoutTab, commandMenuItem, viewField, connectionProvider). It generates the required identifiers.
