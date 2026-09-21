# Setting up Meta Leads

This guide connects your Facebook Page to Twenty, so that everyone who fills in one of your instant forms appears in Twenty as a contact within seconds.

You do not need to know how to code. Everything happens on web pages you click through: Facebook, Meta's business settings, Meta's app dashboard, one Meta tool called the Graph API Explorer, and your Twenty workspace.

Set aside about an hour. If you already have a Facebook Page, a business portfolio and a lead form, skip to step 5 and it takes about 45 minutes.

Every step below was carried out on a real Meta app. Where Meta behaves differently from what you would expect, the guide says so. Meta also renames buttons and menus from time to time, so if a label does not match exactly, look for something close by with a similar name.

## Words you will see

| Word | What it means |
|---|---|
| Page | Your Facebook Page, the one that runs the ads |
| Instant form | The form people fill in without leaving Facebook or Instagram |
| Forms Library | Where Meta keeps your instant forms |
| Lead | One person who filled in that form |
| Business portfolio | Meta's container for your Page, your ads and your team. Formerly called Business Manager |
| App | A set of Meta settings that lets Twenty read your leads. You create it once and nobody ever sees it |
| Token | A long password that lets Twenty read your leads. Treat it like a password |

## What you are about to do

Steps 1 to 4 set up the things you need. Steps 5 to 12 connect them to Twenty.

1. A Facebook Page, with you as an admin.
2. A business portfolio that owns the Page.
3. An instant form on the Page.
4. Twenty, with the Meta Leads app installed and reachable over the internet.

One Twenty workspace connects one Facebook Page. If you collect leads on two Pages, you need two Twenty workspaces.

## Step 1. Create your Facebook Page

Skip this if you already have a Page and you are an admin of it.

**To check whether you are an admin:** open your Page, click **Settings**, then look for **Page access**. Under **People with Facebook access** you should see your own name with full control. If you are not there, ask whoever owns the Page to add you with full control.

**To create a Page:**

1. Go to **facebook.com/pages/create** while logged in to your personal Facebook account.
2. Enter a **Page name**, usually your company name, and pick a **Category** that fits your business.
3. Add a description, photo and cover image if you want. None of this affects lead collection.
4. Click **Create Page**.

You are automatically an admin of a Page you create. A personal Facebook profile is not a Page and cannot collect leads.

## Step 2. Create a business portfolio and add your Page

Skip this if your Page already belongs to a portfolio you administer.

A portfolio matters for two reasons: the lead permission settings in step 10 live inside it, and your Page has to sit in it for the rest of this guide to work.

1. Go to **business.facebook.com**. If you have no portfolio yet, Meta offers to create one. You need a portfolio name, your own name and a work email address.
2. Open **Business settings**, then **Accounts**, then **Pages**.
3. Click **Add**, then **Add an existing Page**, and choose your Page.
   - If you instead see an option like **Request access to a Page**, the Page already belongs to somebody else's portfolio. The current owner has to approve your request before you can continue.
4. Open **Business settings**, then **Users**, then **People**, and check that your own name is listed as an admin.

## Step 3. Create an instant form

Skip this if your Page already has a lead form you are happy with.

1. In **Meta Business Suite**, open **All tools** and look for **Instant Forms**. You may also reach the same place from **Ads Manager** while building a lead ad: at the ad level, choose **Instant form**, then **Create form**. Meta sometimes calls this area the **Forms Library**.
2. Click **Create form** and give the form a name you will recognise later. This name is what appears in Twenty.
3. On the intro screen, write a short headline explaining what people get by filling the form in.
4. Open the **Questions** section. Meta offers ready-made contact fields. Add these three:
   - **Full name**
   - **Email**
   - **Phone number**
5. Add your own questions if you need them. You can write any question you like, including ones with a dropdown of answers, for example a budget range.
6. Meta asks for a link to your **privacy policy**. Have the web address ready, it has to be a page anyone can open.
7. Write the thank-you screen, then finish the form.

**Please include Email, and Phone number if you can.** This is the one choice on the form that changes how Twenty behaves. When a lead arrives, Twenty looks for an existing contact by email first, then by phone number. If a form collects neither, every single submission creates a brand new contact, including repeat enquiries from the same person.

A few other things worth knowing:

- Full name arrives in Twenty split into first and last name.
- Your own questions are all kept on the lead in Twenty, so nothing is lost.
- A form cannot be deleted once created, only archived.
- The form starts collecting as soon as it is attached to a running ad. There is no separate publish button for the form itself.

## Step 4. Install Meta Leads in Twenty

1. In Twenty, open **Settings**, then **Applications**.
2. Find **Meta Leads** and click **Install**. If it is not in the list, ask whoever administers your Twenty workspace to install it for you.
3. Check the left sidebar. A **Lead Ads** section should appear, containing **Status**, **Meta Leads** and **Lead forms**.

**Twenty also has to be reachable over the internet**, because Meta delivers each lead by calling your Twenty workspace directly.

- On Twenty Cloud this is already true and there is nothing to do.
- If your company hosts Twenty itself, ask whoever runs it to confirm that it has a public web address starting with **https**.
- If Twenty only runs on somebody's laptop, or only inside your office network, Meta cannot deliver leads and step 9 will fail.

## Step 5. Create your Meta app

1. Go to **developers.facebook.com**, open **My Apps** and click **Create app**.
2. When Meta asks what you want to do, choose **Capture & manage ad leads**. This one choice sets up most of what follows.
3. When Meta asks, connect the app to the business portfolio from step 2.
4. Open **App settings**, then **Basic**. Keep this page open, or note down two values from it: the **App ID** and the **App secret**. Click **Show** to see the secret. You need the secret in step 8.

Nobody outside your company ever sees this app. It exists only so that Twenty may read your leads.

## Step 6. What your app is allowed to do

**You can skip this step.** Because you chose the lead ads use case in step 5, Meta grants everything needed for your own Page automatically. Read this only if something fails later, or if you like knowing what you agreed to.

These are the permissions involved. You do not tick them here, you tick them in step 7.

| Permission | Why it is needed |
|---|---|
| pages_show_list | See which Pages you manage. **The most important one.** Without it, step 7 cannot find your Page |
| leads_retrieval | Read the answers people gave. Without it, no leads arrive |
| pages_read_engagement | Read your Page's details |
| pages_manage_metadata | Let your Page send leads to Twenty |
| pages_manage_ads | Meta requires it for reading leads |
| ads_management | Meta requires it for reading leads |
| ads_read | Optional. Adds the ad, ad set and campaign name to each lead |

**Where to see them in the dashboard.** Meta has two layouts and you may have either:

- Newer apps built from a use case: in the left menu open **Use cases**, find **Capture & manage ad leads**, and click **Customize**. The permissions are listed there with a status next to each.
- Older layout: in the left menu open **App review**, then **Permissions and features**, and search for the name.

Either way, **Standard access** or **Ready for testing** next to a permission means you are fine. You do not need to submit anything for review. App Review only comes up if you ever want to read leads from a Page owned by a different company.

## Step 7. Get your Page token

This step uses a Meta tool called the **Graph API Explorer**. It is still a web page with dropdowns, but **the order matters**. Doing it in the wrong order is why the Page token option often appears to do nothing.

1. Go to **developers.facebook.com/tools/explorer**.
2. Top right, open the **Meta App** dropdown and choose the app you made in step 5.
3. Leave the dropdown below it on **User Token** for now.
4. Find **Add a Permission** further down. Open it and tick these six:
   - **pages_show_list**
   - pages_read_engagement
   - pages_manage_metadata
   - leads_retrieval
   - pages_manage_ads
   - ads_management
5. Click **Generate Access Token**.
6. Facebook opens a blue confirmation window. Go through it slowly. One screen asks **which Pages this app may use**. Tick your Page, or choose the option to opt in to all Pages, then carry on to the end and confirm.
7. Now open the **User or Page** dropdown again and choose **Get Page Access Token**. Your Page appears in the list. Choose it, and the **Access token** box fills with your Page token. Copy it.

**If point 7 shows an empty list, or flips straight back to User Token**, the permissions or the Page were not granted in the blue window. Either redo points 4 to 6 making sure **pages_show_list** is ticked and your Page is ticked, or skip the dropdown entirely and use the method below, which always works.

### The reliable way to get the token

This also hands you your Page ID at the same time, so you can skip the next section.

1. Keep the **User Token** from point 5 selected.
2. Clear the long text box next to the **GET** dropdown and type exactly: `me/accounts?fields=id,name,access_token`
3. Click **Submit**.
4. The answer lists every Page you manage. Find yours by name. Underneath it, **access_token** is your Page token and **id** is your Page ID. Copy both.

### Check the token before you go on

1. Go to **developers.facebook.com/tools/debug/accesstoken**, the **Access Token Debugger**.
2. Paste your token in and click **Debug**.
3. Read three rows:
   - **Type** should say **Page**.
   - **Expires** should say **Never**.
   - **Scopes** should list the permissions from step 6, including **leads_retrieval**.

If **Expires** shows a date instead of **Never**, your leads will stop arriving on that date. Fix it now with Appendix A, or ask whoever installed the app to do it.

### Find your Page ID

Skip this if you already copied the **id** from the me/accounts answer above.

Otherwise you need one more value: your Page's ID, a long number. Open your Page, go to the **About** tab and look under **Page transparency**. It is also in **Business settings**, then **Accounts**, then **Pages**, next to the Page name.

Treat the token like a password. It can read every lead your Page has ever collected. Never paste it into an email, a chat message or a screenshot. If it ever leaks, repeat step 7 to get a new one and update Twenty.

## Step 8. Put the four values into Twenty

In Twenty, open **Settings**, then **Applications**, then **Meta Leads**, and fill in four boxes.

| Box | What to put in it |
|---|---|
| Meta app secret | The App secret from step 5 |
| Webhook verify token | Any long random text you make up, at least 20 characters. Keep a copy, you need the same text in step 9 |
| Page access token | The token from step 7 |
| Facebook Page ID | Your Page ID from step 7 |

Save. Twenty hides the three secret values from now on and shows dots instead, so keep your own copy somewhere safe, such as a password manager.

## Step 9. Connect the two sides

Now you tell Meta where to send leads.

1. In Twenty, open **Lead Ads**, then **Status**. At the top is a web address called the **callback URL**. Click **Copy**.
2. In the Meta app dashboard, find **Webhooks** in the left menu. Choose **Page** from the dropdown and click **Subscribe to this object**.
3. Paste the callback URL into **Callback URL**, and your made-up text from step 8 into **Verify token**. Click **Verify and save**. Meta checks the address straight away, so if it complains, see "If something goes wrong" below.
4. In the list of fields that appears, find **leadgen** and click **Subscribe**.
5. One more action, because Meta does not offer a button for it. Go back to the **Graph API Explorer** and check that your app is chosen in the **Meta App** dropdown and that the **Access token** box holds your Page token from step 7. If it holds something else, paste the Page token in. Then:
   - Change the dropdown that says **GET** to **POST**.
   - In the long text box next to it, type your Page ID, then `/subscribed_apps?subscribed_fields=leadgen`. It looks like `123456789/subscribed_apps?subscribed_fields=leadgen`.
   - Click **Submit**. The answer below should read `"success": true`.
6. Back in Twenty, on the **Status** page, click **Check again**. It should say **Everything is set up**, and name your Page with the number of forms it found.

## Step 10. Turn on Leads Access

Meta lets a business restrict who may read its leads. If yours has never touched that setting, every Page admin may read leads and there is nothing to do here.

If it has been restricted, open **Business settings**, then **Integrations**, then **Leads Access**. Assign your app as a **CRM**, and assign yourself, or whoever the token belongs to, as a person with access.

If you skip this and your business does restrict leads, Twenty shows the message "Meta blocked lead access" on each lead.

## Step 11. Go live

While your app is new, Meta treats it as unfinished: it sends no leads to it and does not let it read them, not even test leads. Switch it to **Live** with the toggle at the top of the app dashboard.

Meta asks for these first, all on **App settings**, then **Basic**:

| What Meta asks for | Notes |
|---|---|
| Privacy policy URL | A public web page. Yours, not Meta's |
| Data deletion instructions URL | A public page saying how somebody asks you to delete their data |
| App icon | A square image, 1024 by 1024 pixels |
| Category | Pick the closest match |
| Business portfolio | The one from step 2 |

Then flip the toggle to **Live**. That is all that is needed. You do not have to submit the app for review, and you do not need business verification.

These are only needed in specific cases:

| Thing | When you need it |
|---|---|
| App Review | Only to read leads from a Page owned by another company |
| Business verification | Only alongside App Review |
| ads_read permission | Only to see ad and campaign names on each lead |
| App domains, Facebook Login, website settings | Never, for this. Leave them empty |

Because the app is yours, the privacy policy and the deletion promise on those pages are yours to keep.

## Step 12. Check that it works

The Status page in Twenty is the real test. Open **Lead Ads**, then **Status**, and click **Check again**. When it says **Everything is set up** and lists your Page and its forms, the connection is complete.

From then on, each person who submits one of your forms appears in **Lead Ads**, then **Meta Leads**, within a few seconds, and is linked to a contact under **People**. Open **Lead Ads**, then **Lead forms**, to see each form with the questions it asks.

To see a lead arrive before your ads run, ask whoever installed the app to send a test lead. It takes them a minute, see Appendix B.

One thing to avoid: Meta has a page called the **Lead Ads Testing Tool**. Leads created there look like they work, and your form's lead count goes up, but Meta then refuses to hand those leads to any app, including this one. They will show up in Twenty as failed. This is Meta's behaviour and nothing can be done about it, so ignore that tool.

## If something goes wrong

Twenty shows the reason on each failed lead, and on the Status page. Here is what the common ones mean.

| What you see | What it means |
|---|---|
| Meta will not accept the callback URL | The verify token in Meta is not exactly the text you saved in Twenty, or your Twenty workspace is not reachable from the internet. See step 4 |
| Leads are refused, mentioning a signature or 401 | The Meta app secret in Twenty is wrong. Copy it again from App settings, Basic |
| A lead arrived but has no answers | Normal for a moment. Meta's message only carries an ID, and Twenty fetches the answers straight after |
| "Meta blocked lead access", or error 103 | Step 10. Your app is not assigned in Leads Access |
| The token expired or was revoked, or error 190 | Repeat step 7 and paste the new token into Twenty |
| Lead does not exist, or error 100 with subcode 33 | Either the lead came from the Lead Ads Testing Tool, which cannot work, or the Page ID in Twenty is wrong |
| "Provided phone number is invalid" | Somebody typed something that is not a phone number. The lead is kept with all its answers so you can fix the contact by hand |
| Status page looks fine but nothing arrives | Either the Meta app is not Live yet (step 11), or the callback URL in Meta is not the one the Status page shows now. It changes if your Twenty address changes. Redo step 9 |
| Every enquiry creates a duplicate contact | The form collects neither email nor phone number, so Twenty has nothing to match on. See step 3 |
| The lead is in Meta but not in Twenty | Wait an hour. Twenty rechecks your forms every hour and picks up anything it missed |

Leads older than 90 days cannot be recovered. Meta deletes them and does not give them to anyone.

## Appendix A. If your token shows an expiry date

Only needed if the Access Token Debugger in step 7 showed a date next to **Expires** instead of **Never**. This part asks you to paste two addresses into the Graph API Explorer. If that feels uncomfortable, hand this appendix to whoever installed the app.

You need the **App ID** and **App secret** from step 5.

1. In the **Graph API Explorer**, open the token dropdown and generate a **User token** this time, with the same permissions.
2. In the long text box, replace whatever is there with the line below, putting your own three values in place of the words in braces, then click **Submit**:

   `oauth/access_token?grant_type=fb_exchange_token&client_id={App ID}&client_secret={App secret}&fb_exchange_token={the user token you just generated}`

3. The answer contains `access_token` followed by a long string. Copy that string. It is a user token that lasts about two months.
4. Paste that string into the token box at the top of the Explorer, then put this in the long text box and click **Submit**:

   `me/accounts?fields=id,name,access_token`

5. Find your Page in the answer. Copy the `access_token` value listed under it, and the `id` value too, which is your Page ID.
6. Check this new token in the Access Token Debugger. **Expires** should now say **Never**.
7. Paste it into Twenty, in the **Page access token** box from step 8.

A token made this way keeps working indefinitely. It does stop if you change your Facebook password, remove the app, or lose admin rights on the Page.

## Appendix B. Notes for whoever installed the app

- **Send a test lead**: needs Node.js and curl, and is run from the app's source folder. The form ID is on the form's record under **Lead Ads**, then **Lead forms**, and each custom question's key is in its **Question details** field. Run `META_PAGE_TOKEN=<page token> META_FORM_ID=<form id> scripts/create-test-lead.sh "Jane Doe" jane@example.com "+14155550123"`, adding `question_key=answer` for each custom question. The Meta app must be Live (step 11). It replaces the form's single test lead and produces a readable lead, unlike Meta's Lead Ads Testing Tool. Give every field a real value: an empty test lead carries placeholder text that Twenty rejects as a phone number.
- **Import older leads**: run the `meta-backfill-leads` function from **Settings**, then **Applications**, then **Meta Leads**, then **Content**, pick the function and use the **Test** tab. It imports everything Meta still holds, up to 90 days.
- **Hourly catch-up**: `meta-reconcile-leads` runs every hour and re-reads recent leads, so an outage does not lose anything.
- **Behind a tunnel**: the callback URL on the Status page is built from the workspace address, so on a laptop behind a tunnel it shows the local address rather than the tunnel one. Paste the tunnel address into Meta instead.
