# TeamShuffle Monetization Strategy

## Overview

A combined monetization approach with two revenue streams:

1. **Subscription tiers** — hosts/admins pay monthly for premium league features
2. **Payment processing** — integrated match-fee collection where TeamShuffle takes a small cut

The paying customer is the **host/league admin**. Players never pay for app features — only for their match fees through the payment portal.

---

## 1. Subscription Tiers

### Free Tier ("Kickabout")

The free tier should remain generous enough to be genuinely useful for casual games. This keeps the funnel wide and builds word-of-mouth.

| Feature | Limit |
|---------|-------|
| Leagues | 1 |
| Members per league | 15 |
| Active seasons | 1 (no archive) |
| Games per month | 8 |
| Team generation setups | 1 at a time |
| Stats | Basic (goals, MOTM) |
| Finance | Manual ledger only |
| AI features (summaries, input fix) | 3/day |
| Push notifications | Game scheduled, result recorded |
| Guest players ("ringers") | 2 per game |
| Export | PNG with TeamShuffle watermark |

### Pro Tier ("Sunday League") — £4.99/month or £39.99/year

The sweet spot for regular weekly organisers. Removes friction and adds the stats depth that keen players love.

| Feature | Limit |
|---------|-------|
| Leagues | 3 |
| Members per league | 30 |
| Active seasons | Unlimited + archive |
| Games per month | Unlimited |
| Team generation setups | 3 side-by-side |
| Stats | Full (assists, form, win rate, per-season) |
| Finance | Manual ledger + expense approvals |
| AI features | Unlimited |
| Push notifications | All 6 types |
| Guest players | Unlimited |
| Export | Clean PNG, no watermark |
| Payment collection | Enabled (see Section 2) |
| Availability reminders | Automatic, configurable |

### Premium Tier ("Semi-Pro") — £9.99/month or £79.99/year

For clubs/organisations running multiple leagues or large squads. Unlocks everything.

| Feature | Limit |
|---------|-------|
| Leagues | Unlimited |
| Members per league | Unlimited |
| Everything in Pro | Included |
| Custom league branding | Logo, team colours |
| Priority support | Email/chat |
| API access | Read-only stats export |
| Advanced analytics | Head-to-head, player comparison, form charts |
| Multi-admin roles | Admin / Treasurer / Captain |
| Recurring game scheduling | Weekly/fortnightly templates |
| CSV/PDF export | Stats, finance reports |

### Pricing Rationale

- **£4.99/mo** is less than a pint — trivial for someone already spending £5-8 per week on a game. Annual discount (~33% off) incentivises commitment.
- **£9.99/mo** targets semi-organised clubs who might otherwise use spreadsheets or WhatsApp. The value prop is "less admin, more football."
- The free tier's limits (1 league, 15 members, 1 setup) are chosen so casual one-off organisers never hit them, but anyone running a proper weekly game quickly needs Pro.

---

## 2. Payment Processing (Match-Fee Collection)

### The Problem It Solves

Every football organiser's nightmare: chasing people for £7 on a Monday. The existing manual ledger is useful but doesn't move money. Integrating real payments removes the friction entirely.

### How It Works

1. **Host sets a game cost** (already supported: `costPerPerson` field)
2. **Players receive a payment request** via push notification / in-app prompt
3. **Players pay via Stripe** (card, Apple Pay, Google Pay)
4. **Money lands in the host's connected Stripe account** (Stripe Connect)
5. **TeamShuffle takes a small cut** before payout

### Payment Flow (Stripe Connect)

```
Player pays £7.00
  → Stripe processing fee: ~£0.20 + 1.4% = ~£0.30
  → TeamShuffle platform fee: variable (see options below)
  → Host receives: remainder
```

### Platform Fee Options

Here are three models to consider. They're not mutually exclusive — you could combine them.

#### Option A: Percentage Cut (Recommended)

| | Rate | On a £7 game | Host receives | Your revenue per player |
|-|------|-------------|---------------|------------------------|
| Low | 3% | £7.00 | ~£6.49 | £0.21 |
| Medium | 5% | £7.00 | ~£6.35 | £0.35 |
| High | 8% | £7.00 | ~£6.14 | £0.56 |

**Pros:** Scales with usage, feels fair, standard for platforms.
**Cons:** Hosts see a percentage disappearing.

*Recommendation: **5%** — it's the Eventbrite/Ticketmaster zone that people are used to, and on a £7 game it's only 35p per player.*

#### Option B: Fixed Fee Per Transaction

| | Fee | On a £7 game | Host receives | Your revenue per player |
|-|-----|-------------|---------------|------------------------|
| Low | £0.15 | £7.00 | ~£6.55 | £0.15 |
| Medium | £0.25 | £7.00 | ~£6.45 | £0.25 |
| High | £0.50 | £7.00 | ~£6.20 | £0.50 |

**Pros:** Predictable, easy to explain, doesn't grow with game cost.
**Cons:** Takes a larger % on cheaper games, smaller % on expensive ones.

#### Option C: Absorb Into Subscription (No Per-Transaction Cut)

Payment processing is only available on Pro/Premium tiers. No additional transaction fee beyond Stripe's own processing cost (~£0.30 on £7).

**Pros:** Clean, simple, stronger subscription upsell ("upgrade to collect payments").
**Cons:** Misses out on per-transaction revenue which could be significant at scale.

#### Option D: Hybrid (Recommended)

- **Pro tier**: Payment processing enabled, **5% platform fee**
- **Premium tier**: Payment processing enabled, **2% platform fee** (reduced as a perk)
- **Free tier**: No payment processing

This incentivises Premium for high-volume leagues while still generating transaction revenue. The reduced Premium rate is a strong upgrade motivator.

### Who Pays the Fees?

Two approaches:

1. **Host absorbs fees** — The host receives less than £7. Simple, but hosts may not like it.
2. **Player pays fees** — The player is charged £7.35 (or whatever). Host gets the full amount. More palatable for hosts.

*Recommendation: Let the host choose in league settings. Default to "player pays fees" since the host is your paying customer and you want to keep them happy.*

### Revenue Projections (Illustrative)

Assuming a league of 14 players, playing weekly at £7/person:

| Metric | Monthly |
|--------|---------|
| Games | 4 |
| Payments processed | 56 (14 × 4) |
| Gross payment volume | £392 |
| Platform fee (5%) | £19.60 |
| Subscription (Pro) | £4.99 |
| **Total revenue per league** | **£24.59** |

At 1,000 active paying leagues, that's **~£24,590/month** or **~£295K/year**.

---

## 3. Implementation Priorities

### Phase 1: Subscription Infrastructure (Weeks 1-4)

1. Add a `tier` field to the league/user model (`free` | `pro` | `premium`)
2. Integrate Stripe Billing (subscriptions API)
3. Build a pricing page and upgrade flow
4. Implement feature gates throughout the app (check tier before allowing features)
5. Add a billing management page (view plan, cancel, update card)

### Phase 2: Payment Processing (Weeks 5-10)

1. Integrate Stripe Connect (Express accounts for hosts)
2. Build host onboarding flow (KYC, bank details via Stripe's hosted flow)
3. Add "Pay Now" button to game pages for players
4. Build payment request notifications
5. Auto-reconcile payments with the existing finance ledger
6. Add fee configuration in league settings (who pays fees)

### Phase 3: Polish & Growth (Weeks 11+)

1. Add payment reminders (automated nudges for unpaid players)
2. Build a "debt dashboard" showing who owes across all games
3. Add receipts/invoices for players
4. Implement refund flow (game cancelled)
5. Add annual billing discount toggle
6. Track conversion metrics (free → pro, pro → premium)

---

## 4. Key Technical Decisions

### Stripe Connect Account Type

Use **Stripe Connect Express** accounts for hosts:
- Stripe handles KYC/identity verification
- Stripe hosts the onboarding form (minimal UI work)
- Supports instant payouts (paid feature from Stripe)
- You set the platform fee via `application_fee_amount` on each payment

### Subscription Management

Use **Stripe Billing** with:
- `price` objects for each tier/interval (monthly/annual)
- Webhook handlers for `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
- Store `stripeCustomerId` and `subscriptionTier` on the user document in Firestore
- Cloud Function to sync Stripe webhook events → Firestore

### Feature Gating

Create a simple utility:

```typescript
// utils/tierGating.ts
export const TIER_LIMITS = {
  free:    { leagues: 1,  members: 15, setups: 1, guestsPerGame: 2 },
  pro:     { leagues: 3,  members: 30, setups: 3, guestsPerGame: Infinity },
  premium: { leagues: -1, members: -1, setups: 3, guestsPerGame: Infinity },
} as const;

export function canUseFeature(tier: Tier, feature: string): boolean { ... }
```

### Data Model Changes

```typescript
// On the user document
interface User {
  // ... existing fields
  stripeCustomerId?: string;
  subscriptionTier: 'free' | 'pro' | 'premium';
  subscriptionStatus: 'active' | 'past_due' | 'cancelled';
}

// On the league document
interface League {
  // ... existing fields
  stripeConnectAccountId?: string;  // host's Stripe Express account
  paymentFeeModel: 'host_absorbs' | 'player_pays';
  platformFeePercent: number;       // set based on tier
}

// New collection: payments/{paymentId}
interface Payment {
  gameId: string;
  leagueId: string;
  playerId: string;
  amount: number;           // in pence
  platformFee: number;      // in pence
  stripeFee: number;        // in pence
  hostPayout: number;       // in pence
  stripePaymentIntentId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  createdAt: Timestamp;
}
```

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Hosts resist paying — "it was free" | Grandfather existing leagues on a generous free tier for 6 months. Announce changes early with clear value messaging. |
| Players won't pay through the app | Make it frictionless (Apple Pay / Google Pay). Show "you owe £7" prominently. Peer pressure does the rest. |
| Stripe Connect onboarding friction | Use Express accounts (Stripe handles the form). Add a clear "why" explanation. |
| Low conversion to paid tiers | Free tier must feel limited but not crippled. Focus the gate on features hosts *want* (3 setups, payment collection) not features they *need* (basic team generation). |
| Regulatory (holding/moving money) | Stripe handles all money transmission. TeamShuffle never holds funds. Stripe Connect handles payouts and compliance. |
| Churn after free trial | Offer 14-day free trial of Pro. Follow up with "your league generated 12 team sheets last month" retention emails. |

---

## 6. Summary

| Revenue Stream | Model | Expected Revenue per League |
|----------------|-------|-----------------------------|
| Subscriptions | £4.99-9.99/mo per host | £4.99-9.99/mo |
| Payment processing | ~5% platform fee on match fees | ~£15-25/mo |
| **Combined** | | **~£20-35/mo per active league** |

The payment processing revenue is likely larger than subscriptions at scale, but subscriptions provide predictable recurring revenue. Together they create a strong, diversified model where the subscription gets hosts in the door and payment processing generates ongoing transactional income.
