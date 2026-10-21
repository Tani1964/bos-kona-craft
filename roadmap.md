# Roadmap

## Wear intelligence (notification + fallback)
- [x] Schema: wear_events lifecycle (status, detected_via, outing_key, expiry, notification status)
- [x] Schema: push_devices, notification_log, owner_settings, presence_pings
- [x] Provider-agnostic notification service (FCM adapter behind an interface)
- [x] Potential wear events from presence inference, with outing dedupe
- [x] Fallback: pending events surfaced in-app when no push arrives
- [x] Confirm / decline / dismiss, one confirmed wear slot per outing
- [x] Stale potential events expire (never auto-confirm)
- [x] Wear-dependent intelligence (KFI, Longevity, insights) counts confirmed only
- [x] Owner controls: wear intelligence + notifications toggles
- [x] Admin observability: wear status + notification log
- [x] Admin observability: wear status tiles + message log
- [x] Morning rain warning in daily pass
- [x] Firebase Cloud Messaging connection (needs user to connect; fallback works without it)
## Limited-edition store connection
- [ ] Define a signed, limited-edition-only webhook contract and developer handoff guide
