# Cifra — Quiz Funnel Engine

A production quiz funnel: landing page → 25-question cognitive assessment → scored results → paid report offer. Built as a reusable pattern, not a one-off page.

**Live:** https://cifra-mu.vercel.app

## What it does

A visitor lands, takes a 25-question assessment, and receives a scored profile. The scoring engine maps raw answers to result tiers, and each tier drives a different results page and offer. The funnel drives toward a paid PDF report.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Framer Motion for transitions
- Deployed on Vercel

## Structure

All application code lives in `cifra-app/`.

## Running locally

```bash
cd cifra-app
npm install
npm run dev
# http://localhost:3000
```

## Decisions and assumptions

- **Question bank as data, not markup.** The funnel is driven by a typed data file so a new vertical is a content change, not a rewrite. The funnel is a template.
- **Client-side scoring.** No backend. The assessment qualifies leads; it is not a clinical instrument, so visible scoring logic in exchange for zero infrastructure was an acceptable trade-off.
- **No session persistence.** An abandoned quiz is intentionally lost, not resumed.
- **Not a diagnostic tool.** This is an engagement and segmentation device, not a validated psychometric instrument.

## Current state

The funnel is live and complete through the results and offer screens. Payment gateway integration is stubbed (`OfferScreen.tsx`) — the conversion path is built but not wired to a live processor.
