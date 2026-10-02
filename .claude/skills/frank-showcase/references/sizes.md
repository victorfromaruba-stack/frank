# Store and social image rules

Checked 2 October 2026 against the official pages below. Stores change these
rules every year or two: re-check before a big submission, and update this file
and `scripts/check.cjs` together.

## Apple App Store

| Display | Status | Portrait sizes (swap for landscape) |
|---|---|---|
| iPhone 6.9" | **Required** (or give a 6.5" set instead) | 1320 x 2868, 1290 x 2796, 1260 x 2736 |
| iPhone 6.5" | Required only without a 6.9" set | 1284 x 2778, 1242 x 2688 |
| iPhone 6.3" and smaller | Optional, scaled from the larger set | 1206 x 2622, 1179 x 2556 |
| iPad 13" | Required only if the app runs on iPad | 2064 x 2752, 2048 x 2732 |

- **Format:** JPEG or PNG, no alpha channel or transparency (added to the docs on 8 July 2026). Export in sRGB.
  Apple publishes no file size limit.
- **Count:** 1 to 10 per display size, per language.
- **Captions** are allowed: guideline 2.3.3 says screenshots "may also include text and image overlays".
- **Rules that matter:**
  - **2.3:** screenshots "accurately reflect the app's core experience".
  - **2.3.3:** "show the app in use, and not merely the title art, login page, or splash screen".
  - **2.3.7:** no prices in screenshots.
  - **2.3.10:** no imagery of other platforms.
- **Frames:** Apple's marketing guidelines ask for Apple's own device images, unmodified, when an iPhone is
  shown. Our frame is a generic phone (no Dynamic Island, no logo). `"frame": "none"` is always safe.
- **App previews** (video, not made here): 15 to 30 s, up to 3, 886 x 1920 for 6.9" and 6.5".

Sources:
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/help/app-store-connect/release-notes/
- https://developer.apple.com/app-store/review/guidelines/ (updated 8 June 2026)
- https://developer.apple.com/app-store/marketing/guidelines/

## Google Play

| Asset | Rules |
|---|---|
| Phone screenshots | JPEG or 24-bit PNG, no alpha. Each side 320 to 3840 px. **The long side may be at most 2x the short side**, so a 1320 x 2868 iPhone capture is refused: use 1080 x 1920. Minimum 2 screenshots, maximum 8 |
| To be recommended | At least 4 screenshots of 1080 x 1920 or more (9:16), or 1920 x 1080 (16:9) |
| Feature graphic | **Required.** 1024 x 500, JPEG or 24-bit PNG, no alpha. Keep the important part in the middle: the edges can be cut off |
| App icon | 512 x 512, 32-bit PNG, up to 1024 KB. Play rounds the corners |

What Play asks of screenshots and the feature graphic, for an app to be recommended:
- no "Best", "#1", "Top", "New", "Discount", "Sale", "Million downloads", awards, testimonials or prices;
- no "Download now" style calls to action;
- words take up no more than 20% of the image;
- no device imagery, no store badges.

Breaking these limits promotion; it doesn't remove the listing. The metadata policy bans misleading
screenshots and promotional images outright.

Sources:
- https://support.google.com/googleplay/android-developer/answer/9866151
- https://support.google.com/googleplay/android-developer/answer/9898842

## Instagram

| Format | Pixels | Notes |
|---|---|---|
| Feed, tallest | 1080 x 1440 (3:4) | Allowed since 29 May 2025; matches the profile grid |
| Feed | 1080 x 1350 (4:5) | Still fine; the grid trims about 34 px each side |
| Square | 1080 x 1080 | The grid shows only the middle 810 x 1080 |
| Carousel | Same sizes as the feed | Up to 20 items, all the same shape |
| Story / Reel cover | 1080 x 1920 (9:16) | Keep words out of the top 14%, bottom 35% and 6% at the sides (Meta's ads guide) |

Instagram stores photos at most 1080 px wide and crops anything outside 1.91:1 to 3:4.
The profile grid turned from squares to rectangles in January 2025. Most sources say 3:4;
Instagram's own help doesn't state the shape.

Sources:
- https://help.instagram.com/1631821640426723
- https://help.instagram.com/269314186824048
- https://www.facebook.com/business/ads-guide/update/image/instagram-story
- https://petapixel.com/2025/05/29/instagram-finally-adds-support-for-34-aspect-ratio-photos/
