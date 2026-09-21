# Changelog

All notable changes to this application are documented in this file.

## 0.1.0

- Real-time import of Meta Lead Ads leads through a signed webhook.
- Leads matched to an existing Person by email, then phone; new People created otherwise.
- Every submission stored as a Meta Lead with form, ad, campaign, platform, answers and consent.
- Lead forms synced with their questions, locale, headline and lead counts.
- Hourly reconciliation and a 90-day backfill.
- Status page with the callback URL, a connection check and recent failures.
