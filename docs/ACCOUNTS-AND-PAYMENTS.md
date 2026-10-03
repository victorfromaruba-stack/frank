# Accounts and payments: what's built, what's next

## Built now (no server)

- **Members**: a free trial (`BILLING.trialDays`, 7) that starts on the price
  screen after onboarding (or with the first workout), then the membership. The
  price screen shows only the plans Frank said yes to (`approved` in
  `BILLING.plans`: €15 a month) and links to a checkout page once
  `BILLING.paymentLink` is set. Until then it offers "Tell me when it opens": a
  message for Frank, pasted in his Instagram chat.
- **Frank's clients**: Frank writes a session in Coach tools (open only on a
  phone where he typed his coach code) and sends it as a link. Opening it puts
  the session on the client's plan and opens the app to them without the
  membership. Frank bills his clients himself.

All of this runs in the person's browser. That makes it easy to try, and easy
to get around: someone who knows how can clear the trial, open the app
without paying or open Coach tools without the code. It's fine for a pilot with Frank's clients, not for selling
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

## The payment provider: Frank sells from the Netherlands

Frank works in The Hague, so the simplest set-up has his Dutch business (registered with
the KvK) as the seller:

- **Mollie** (Dutch): iDEAL, cards and recurring payments for subscriptions. It is the
  most familiar checkout for Dutch customers: https://www.mollie.com/
- **Stripe** supports Dutch businesses, with iDEAL and cards, Stripe Billing for
  subscriptions and Stripe Tax for VAT: https://stripe.com/global
- **Paddle** is a merchant of record, so it handles EU VAT itself:
  https://developer.paddle.com/concepts/sell/supported-countries-locales

With Mollie or Stripe, Frank's business charges VAT. Digital services to EU consumers use
the customer's country rate (21% in the Netherlands), so set prices including VAT.

If the studio in Aruba were the seller instead: Stripe doesn't accept businesses based in
Aruba
(https://support.stripe.com/questions/stripe-availability-for-outlying-territories-of-supported-countries),
while Paddle and PayPal may.

`BILLING.paymentLink` takes any checkout link (Mollie, Stripe, Paddle or PayPal), so the app
doesn't change when you pick one. Prices are in euro.

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

1. The yearly price and the trial length (now €119.99 a year and 7 days free:
   placeholders in `BILLING.plans`; the price screen shows the yearly plan only
   once it has `approved: true`). The monthly price is decided: €15.
2. Payment provider (Mollie or Stripe through Frank's Dutch business, or Paddle).
3. Web app first, or straight into the stores.
4. Whether Frank's clients also get the generated plans (now: yes).
5. Personal, the app for Frank's one-to-one clients: see `docs/PERSONAL.md`.
