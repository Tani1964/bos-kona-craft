# Bos' Kọ́nà Legacy

Project: Bos’ Kọ́nà Craft Passport - Universal Infrastructure

Tech Stack: React, Tailwind CSS, Framer Motion, Lucide Icons. (Dark mode only).

Constraint: STRICTLY MOBILE-FIRST APP UI.

The entire layout must be constrained to a mobile viewport (max-w-md mx-auto h-screen overflow-y-auto pb-24).

Do not build a desktop dashboard. It must look and feel like a native premium iOS app.

Hide standard web scrollbars.

Aesthetic & Brand Identity: High-end Afro-futurist luxury. Cinematic charcoal/black background (bg-stone-950). Warm earthy accents (leather browns, terracotta). Editorial serif for headings, crisp monospaced font for data. It should feel like Porsche telemetry meets bespoke craftsmanship.

Layout & Component Architecture (Top to Bottom):

1. Core Identity & Authentication (Modules 1, 2, 4):

Top Nav: Left side shows "BOS’ KỌ́NÀ". Right side shows a "Store" icon.

Large elegant serif title: "AIR FORMULA F1 NEW".

Below it, a monospaced asset string: ASSET // 8F92-A4B1.

A verified badge row: Display a green "Authentic" shield icon, and a "Verified Owner" pill next to it.

2. Intelligence Engine (Modules 5, 6, 7):

A large, glowing bronze circular gauge taking up the top third of the screen.

Center text: "92.6" (Large) and "KFI SCORE" (Small).

Directly under the score inside the ring, a small status pill: STAGE: BREAKING IN.

Below the ring, a 3-column data row: "WEAR: -15.0", "AGE: -2.4", "CARE: +10.0".

Below the data row, a subtle text string for Longevity Simulator: Estimated Lifespan at current wear rate: 4.2 Years.

3. The Dynamic Module Feed (Modules 3, 8, 9, 10, 11, 12, 13):

Below the Intelligence section, create a vertical stack of full-width mobile cards. Give them a subtle frosted/dark texture (bg-white/5 border border-white/10 rounded-xl p-4 mb-4).

Card 1 (Mod 3 - Timeline): "Ownership Timeline". Subtitle: "30 Wears Logged". Show a mini-preview of a recent user photo.

Card 2 (Mod 10 - Provenance): "Craft Provenance". Subtitle: "Material & Design Journey".

Card 3 (Mod 9 - Narrative): "Documentary: Origin". Show a large cinematic film thumbnail with a play button overlay.

Card 4 (Mod 9 - Narrative): "Documentary: Transformation". Make it look locked (opacity 50%) with a lock icon. Subtitle: "Unlocks at 50 Wears".

Card 5 (Mod 11/12 - Ecosystem/Drop Access): "Archive Collection Access". Visually locked with a lock icon. Subtitle: "Unlocks at Venerated Stage (KFI < 40)".

4. Fixed Bottom Action Bar (Modules 3 & 5 Input):

Create a fixed footer (fixed bottom-0 w-full max-w-md bg-stone-950/90 backdrop-blur-md pb-safe p-4 z-50).

Hovering just above the buttons, add a small Care Intelligence suggestion pill: Recommendation: Condition Leather.

Split the footer into two large, thumb-friendly buttons side-by-side (h-14 rounded-lg font-bold).

Button 1: "Out the Door" (Walking icon, warm bronze background, dark text).

Button 2: "Log Care" (Shield icon, dark grey background, white text).

Interaction: Smooth Framer Motion fade-ins on load. The KFI ring must animate from 0 to 92.6.

How this maps to your Master System:

This prompt forces Lovable to build the container framework.

Modules 1-7 are strictly mapped to the top-half UI and the action bar.

Modules 8-13 are built as reusable "Cards" in the vertical feed.

Modules 14 & 15 (State Engine and Ecosystem) are the unseen backend controllers that will eventually dictate which cards render in that feed and whether they have a lock icon on them or not.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bos-kona-craft.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/416343da-5b1e-41cf-9445-75c5d96f52cc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
