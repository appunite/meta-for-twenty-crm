# Changelog

All notable changes to this application are documented in this file.

## 1.1.0

- Connect button on the Status page: paste a Meta User token and Twenty checks its permissions, gets a Page token that never expires, registers the webhook and subscribes the Page to leads. It shows the Page ID and Page token to copy into the app settings, and saves nothing itself.
- The webhook verify token is now optional. Twenty accepts a token derived from the Meta app secret, and still accepts the one in Settings.
- Setup guide notes on which steps the Connect button lets you skip.
- Gallery screenshots and a new logo.

## 0.1.0

- Real-time import of Meta Lead Ads leads through a signed webhook.
- Leads matched to an existing Person by email, then phone; new People created otherwise.
- Every submission stored as a Meta Lead with form, ad, campaign, platform, answers and consent.
- Lead forms synced with their questions, locale, headline and lead counts.
- Hourly reconciliation and a 90-day backfill.
- Status page with the callback URL, a connection check and recent failures.
