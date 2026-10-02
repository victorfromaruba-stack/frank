# Accounts and payments: what's built, what's next

## Built now (no server)

- **Members**: a free trial (`BILLING.trialDays`, 7) that starts with the first
  workout, then a paywall that links to a checkout page (`BILLING.paymentLink`).
- **Frank's clients**: Frank writes a session in Coach tools and sends it as a
  link. Opening it puts the session on the client's plan and opens the app to
  them without the membership. Frank bills his clients himself.

All of this runs in the person's browser. That makes it easy to try, and easy
to get around: someone who knows how can clear the trial or open the app
without paying. It's fine for a pilot with Frank's clients, not for selling
memberships to strangers.

## What a real membership needs

1. **Accounts**: sign-in by email link (no passwords), so a membership follows
   the person to a new phone and their history is backed up.
2. **A payment provider** that tells the server who has paid (a webhook).
3. **A small server** that stores accounts, memberships, Frank's clients and
   the sessions he assigns. Supabase does all three (database, sign-in,
   functions) on its free tier to start. The Supabase connector in this
   workspace needs to be authorized before Claude can set it up.

With that in place, Coach tools can show Frank his client list, assign
sessions without sending links, and see who trained.

## The payment provider: Aruba matters

- **Stripe does not accept businesses based in Aruba** (outlying territories
  of supported countries aren't supported):
  https://support.stripe.com/questions/stripe-availability-for-outlying-territories-of-supported-countries
  It works if the business is registered in a Stripe country (a US LLC, for
  example).
- **Paddle** is a merchant of record: it sells in 200+ countries, handles sales
  tax, and pays out monthly by bank transfer, PayPal or Payoneer:
  https://developer.paddle.com/concepts/sell/supported-countries-locales
  Check with Paddle that an Aruban seller is accepted.
- **PayPal subscriptions** (plans with trials, monthly billing). Check that an
  Aruban business account can use them.

`BILLING.paymentLink` takes any checkout link (Paddle, PayPal or Stripe), so
the app doesn't change when you pick one.

## If the app goes into the App Store or Google Play

- A subscription that opens app content (the generated plans) must use
  Apple's in-app purchase in the iOS app (guideline 3.1.1); Google Play is
  similar for Android.
- Frank's one-to-one coaching may be paid outside the app: Apple guideline
  3.1.3(d) names fitness training as a real-time person-to-person service.
  One-to-few or one-to-many classes must use in-app purchase.
  https://developer.apple.com/app-store/review/guidelines/#person-to-person-services
- The web version can keep its own checkout. Many apps sell on the web and
  in the stores side by side.

## Decisions for Victor and Frank

1. Price and trial length (now $9.99 a month, 7 days: placeholders).
2. Payment provider (Paddle, PayPal, or a company in a Stripe country).
3. Web app first, or straight into the stores.
4. Whether Frank's clients also get the generated plans (now: yes).
