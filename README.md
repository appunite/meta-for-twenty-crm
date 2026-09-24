# Meta for Twenty CRM

Brings leads from Facebook and Instagram instant forms into Twenty as People, in real time, with the full form submission kept alongside.

## What you get

- New leads arrive within seconds through a Meta webhook.
- Each lead is matched to an existing Person by email, then by phone. New contacts are created automatically.
- Every submission is stored as a Meta Lead record linked to the Person: form, ad, ad set, campaign, platform, all answers and consent checkboxes.
- Each form is synced with its questions, locale, headline, privacy policy link and lead counts, so you can see what people were asked.
- An hourly check re-reads recent leads, so nothing is lost if a webhook is missed.
- A backfill imports the leads Meta still keeps (the last 90 days).
- Duplicate deliveries from Meta are ignored.
- A status page shows the webhook URL to paste into Meta, checks the connection to your Page with a hint on how to fix what is wrong, and lists recent failed leads with the reason Meta or Twenty gave.

## How it works

You connect your own Meta app, so your lead data goes straight from Meta to your Twenty workspace. No third party stores or relays it. Setup takes about 45 minutes and is described step by step in [SETUP.md](SETUP.md).

## Limitations

- One Facebook Page per workspace. A second Page needs a second Twenty workspace with its own token.
- Meta deletes lead data after 90 days, so older leads cannot be imported.
- Leads created in Meta's Lead Ads Testing Tool cannot be imported. Meta refuses to return them to any app. Send test leads through the API instead, as described in the setup guide.
- Leads are not turned into Opportunities.

## Privacy

The app stores the answers and consent responses a person submitted in a Meta instant form, plus ad and campaign identifiers. It does not send data back to Meta. As the owner of the Meta app you are responsible for its privacy policy and data deletion instructions.

## Want your Growth operating system built around your team?

This app is one piece. Appunite designs and builds the rest: ads, forms, enrichment, routing and reporting, connected to Twenty and shaped around how your team sells.

Since 2010, Appunite builds custom software and AI solutions for mid-size and growth-stage companies.

[Talk to us](https://www.appunite.com/get-in-touch)

## Changelog

Notable changes are documented in [CHANGELOG.md](CHANGELOG.md).
