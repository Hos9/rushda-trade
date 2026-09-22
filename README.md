# AR / AP Manager

A Next.js (App Router) web app to track customer receivables and supplier
payables — sales, receipts, purchases, payments, items, and a party-wise
dashboard. Auth and database are both powered by **Supabase's free tier**.

## Features

- **Dashboard** — party-wise Accounts Receivable (by customer) and Accounts
  Payable (by supplier), plus totals.
- **Sales** — record sales invoices to customers with multiple item lines.
- **Received** — record money received from customers; add new customers
  inline or from the Customers page.
- **Purchase** — record purchases from suppliers with multiple item lines.
- **Payment** — record payments made to suppliers; add new suppliers inline
  or from the Suppliers page.
- **Items** — master list of items with purchase/sale prices, used to
  auto-fill rates on sales and purchase lines.
- **Profile** — editable name/company, backed by a `profiles` table.
- Supabase Auth (email/password) — every table is protected by Row Level
  Security so each account only ever sees its own data.

## Stack

- Next.js 14 (App Router, JavaScript)
- Supabase (Postgres database + Auth), via `@supabase/supabase-js` and `@supabase/ssr`
- Tailwind CSS

## 1. Create a free Supabase project

1. Go to https://supabase.com, sign up, and create a new project (pick any
   name/region, set a database password — you won't need it for this app).
2. Once it's ready, open **Project Settings → API**. You'll need:
   - **Project URL**
   - **anon public** key

## 2. Set up the database schema

1. In your Supabase project, open **SQL Editor → New query**.
2. Paste in the entire contents of `supabase/schema.sql` from this project
   and click **Run**.
3. This creates every table the app needs (`profiles`, `customers`,
   `suppliers`, `items`, `sales`, `purchases`, `receipts`, `payments`),
   turns on Row Level Security on all of them, and adds a trigger that
   auto-creates a `profiles` row whenever someone signs up.

## 3. (Optional but recommended for quick testing) Disable email confirmation

By default Supabase requires users to click a confirmation link before they
can sign in. For fast local testing:

- Go to **Authentication → Providers → Email** and turn off "Confirm email".
- Leave it **on** for anything you plan to actually share/deploy.

## 4. Install dependencies

```bash
npm install
```

## 5. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — your Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your anon public key

## 6. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Click
"Create one" to sign up. If email confirmation is on, check your inbox for
the confirmation link first.

## Data model (Postgres tables, via Supabase)

Every business table has a `user_id` column and a Row Level Security policy
restricting all reads/writes to `auth.uid() = user_id`, so users can never
see each other's data even though they share the same tables.

- `profiles` — one row per user: `full_name`, `company_name` (auto-created on signup)
- `customers` — name, phone, email, address, opening_balance
- `suppliers` — name, phone, email, address, opening_balance
- `items` — name, unit, purchase_price, sale_price
- `sales` — customer_id, date, invoice_no, items (jsonb array), total_amount, note
- `purchases` — supplier_id, date, invoice_no, items (jsonb array), total_amount, note
- `receipts` — customer_id, date, amount, mode, note (received from customer)
- `payments` — supplier_id, date, amount, mode, note (paid to supplier)

Balances shown on the Dashboard are computed client-side as:

- **AR (per customer)** = opening_balance + total sales − total received
- **AP (per supplier)** = opening_balance + total purchases − total paid

## Notes / next steps you may want to add

- Edit forms for sales/purchases (currently create + delete only).
- PDF/print invoice generation.
- Password reset flow (Supabase Auth supports this out of the box —
  `supabase.auth.resetPasswordForEmail`).
- Date-range filters and CSV export on the ledger pages.
