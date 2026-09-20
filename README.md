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
