# Limited-Edition Store Webhook

## Goal
Give the store developer a clear, secure connection contract that creates passports only for limited-edition purchases.

## Work
- Extend the existing inbound webhook to require an explicit `is_limited_edition` flag, skip non-limited products without database writes, and preserve signature verification and existing passport creation behavior.
- Move privileged database-client loading inside the verified request handler.
- Add focused tests for limited-edition eligibility and a developer handoff guide with the exact URL, payload, signature steps, and connection sequence.
- Verify the webhook changes with the relevant test and preview build signals.

## Technical details
The integration remains a store-to-passport HTTP POST. The store developer maps the store's own product classification into the normalized `is_limited_edition` boolean; each request represents one physical unit and includes its box serial. No store API or platform-specific code is assumed until the store platform is identified.
