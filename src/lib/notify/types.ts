// Shared notification channels for the whole Craft Passport.
// Every message carries `notification_type` in its payload; the client and
// the log read it. Add a new channel here — nothing else needs to change.
export const NOTIFICATION_TYPES = [
  "wear_nudge",
  "care_nudge",
  "weekly_combined_nudge",
  "weather_advisory",
  "kfi_milestone",
  "system_message",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Older kinds already in the log stay valid. */
export type LegacyKind = "test" | "wear_prompt" | "rain_warning" | "care_whisper";

export type NotificationKind = NotificationType | LegacyKind;

export const FALLBACK_TYPES: NotificationType[] = [
  "wear_nudge",
  "care_nudge",
  "weekly_combined_nudge",
];
