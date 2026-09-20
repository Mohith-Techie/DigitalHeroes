# Digital Heroes

A full-stack subscription platform combining golf performance tracking, charitable giving, and an algorithmic monthly prize draw. This repository fulfills the requirements of the Digital Heroes Product Requirements Document (Level 1) trainee assignment.

## Architecture & Core Features

* **Subscription & Access Control:** Integrated with Stripe Checkout and Webhooks for monthly and yearly subscriptions. Route protection is enforced via a strict Data-Access Layer (DAL), falling back to fail-closed on database errors.
* **Score Management:** Implements a rolling 5-score logic, storing only the most recent entries while strictly enforcing the 1-45 Stableford score format. 
* **Algorithmic Draw Engine:** A pure, testable arithmetic engine that calculates tier distributions (5-number, 4-number, and 3-number matches) based on active subscriber revenue and score percentiles. Includes jackpot rollover logic for undistributed funds.
* **Charity System:** Users select a charity from a searchable directory, committing a configurable percentage of their subscription fee (minimum 10% enforced).
* **Admin Control Panel:** Secured via database-level role verification. Allows administrators to simulate and execute monthly draws, manage charities, and verify user-uploaded payout proofs.

## Tech Stack

* **Framework:** Next.js 16 (App Router, Server Actions)
* **Database & Authentication:** Supabase (PostgreSQL, Row Level Security, Triggers)
* **Payments:** Stripe SDK
* **Styling:** Tailwind CSS
* **Deployment:** Vercel

## Local Setup

**1. Clone and install dependencies**
```bash
git clone [https://github.com/Mohith-Techie/DigitalHeroes.git](https://github.com/Mohith-Techie/DigitalHeroes.git)
cd DigitalHeroes
npm install
```

## 2. Environment Variables

Create a `.env.local` file in the root directory and populate it with your Supabase and Stripe credentials:

```env
# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CURRENCY=USD

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SECRET_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_SECRET_KEY=your_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_PRICE_MONTHLY=price_monthly_id
NEXT_PUBLIC_PRICE_YEARLY=price_yearly_id
```

## 3. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

## 4. Stripe Webhook Testing (Local)

To test Stripe payments locally, forward Stripe webhook events to your local API:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Stripe CLI will provide a webhook signing secret. Add that value to your `.env.local` file as:

```env
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

## Admin Access

By default, newly registered users are assigned the `user` role.

To access the Admin Dashboard (`/admin`) and Admin Payouts (`/admin/payouts`), first create an account and then elevate your account to an admin using the Supabase SQL Editor.

Replace `your-email@example.com` with the email address of the account you created:

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

After running the query, log out and log back in to refresh your session with the updated admin role.
