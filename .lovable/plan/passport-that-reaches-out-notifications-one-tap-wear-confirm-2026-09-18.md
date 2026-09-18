# Passport that reaches out: notifications + one-tap wear confirmation

Yes — I understand. The passport stops waiting to be opened. It notices, it pings the phone
from outside the app, and the owner answers with a single tap.

## What the owner experiences

**1. "Looks like you're out"**
When the passport notices the owner is away from their usual area, it sends a phone
notification: *"Looks like you're out. Wearing the Air Form today?"* with two buttons,
**Yes** and **Not today**.

- **Yes** → opens the passport and records the wear (weather for that place and time is
  attached automatically).
- **Not today** → nothing is recorded, and the passport won't ask again for the rest of the day.
- **No answer** → the wear is held as *unconfirmed* for 12 hours, then quietly discarded.
  Unconfirmed sessions never touch the wear count, the Longevity projection, or the KFI score.
  Only the day's weather and "owner was out" stay as soft context.

Asked at most once a day, and only when the away-signal is strong enough (minimum time and
distance from the usual area) — never on a coffee-shop hop.

**2. Weather warnings before leaving**
*"Rain expected around 9:00 AM — maybe not the morning for the Air Form."*
Sent in the morning only when rain probability is high and the owner has worn the piece
recently. One per day, maximum.

**3. Care nudges**
The existing daily insight engine (humidity build-up, maintenance overdue) now also sends
its whisper as a notification instead of waiting silently inside the app.

**4. Turning it on**
One calm screen after claiming: what gets checked, that location is only read while the
passport is open, that no address is ever stored, and a single **Allow notifications** button.
Skippable, re-offerable later from the passport, and switchable off any time.

## What the admin sees

In `/atelier` → Observability: notifications sent, confirmed vs. declined vs. ignored wear
prompts, and the raw wear log with each entry marked confirmed / declined / expired.

## Technical outline

- **Push transport:** Firebase Cloud Messaging via the Lovable connector (web push enabled),
  sent server-side through the gateway. A dedicated `firebase-messaging-sw.js` messaging
  worker, separate from the existing PWA cache worker.
- **New tables:** `push_devices` (owner phone → FCM token, per device),
  `notification_log` (kind, sent_at, outcome). `wear_events` gains
  `confirmation_state` (`pending` | `confirmed` | `declined` | `expired`) and
  `detected_via` (`prompt` | `manual` | `nfc`).
- **Wear-signal source:** passive away-from-home check at app open (existing geolocation
  path, home zone derived from history, never typed) plus notification-driven opens.
- **Engines:** `kfi.ts` and `longevity.ts` filter to `confirmation_state = 'confirmed'`,
  so inference never inflates the numbers.
- **Senders:** server functions for the wear prompt and rain warning; the existing
  `hooks/generate-insights` cron gains a morning rain pass and push dispatch.
- **Out The Door** stays, demoted to an optional shortcut for owners who want a live check
  before leaving; copy reworded so it never reads as an obligation.
- Stale FCM tokens (404 UNREGISTERED) are deleted rather than retried.

## Needs from you

Connecting Firebase Cloud Messaging with web push — I'll open the connect card; it asks for
a Firebase project's service account plus the web API key, app ID, and VAPID key. Nothing
can be sent until that connection exists.

## Honest limits

Notifications only reach owners who installed the passport to their home screen — iOS
requires that. And this remains confirmation, not sensing: the shoe itself still isn't
reporting. A confirmed tap is ground truth; everything else stays soft.
