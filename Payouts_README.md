## Payouts - Feature Overview and Implementation Guide

This document explains how Payouts are modeled, fetched, edited, displayed in the UI, and exported to PDF in this application. It covers the database schema, migrations, services, UI flow, and validations.

### High-level Concepts
- **Payout** represents the money owed to a member for a savings slot period (duration × monthly amount), including deductions and additional costs.
- The Payouts page lists members with payouts, provides a detailed modal to calculate final amounts, capture payment details, and generate a PDF.

---

## Database

### Tables

- `payouts` (stores per member-group payout details and admin toggles)
  - `id BIGSERIAL PK`
  - `group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE`
  - `member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE`
  - `monthly_amount DECIMAL(12,2) NOT NULL`
  - `duration INTEGER NOT NULL`
  - `last_slot BOOLEAN DEFAULT FALSE`
  - `administration_fee BOOLEAN DEFAULT FALSE`
  - `payout BOOLEAN DEFAULT FALSE` (status toggle for whether payout is done)
  - `additional_cost DECIMAL(12,2) DEFAULT 0`
  - `payout_date DATE DEFAULT CURRENT_DATE`
  - `payout_month VARCHAR(7) DEFAULT '2025-08'` (YYYY-MM)
  - `payment_method VARCHAR(20) NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'cash'))`
  - `sender_bank BIGINT REFERENCES banks(id) ON UPDATE CASCADE ON DELETE RESTRICT` (nullable)
  - `receiver_bank BIGINT REFERENCES banks(id) ON UPDATE CASCADE ON DELETE RESTRICT` (nullable)
  - `notes VARCHAR(100)` (nullable)
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ DEFAULT NOW()`
  - Constraints and indexes:
    - `UNIQUE(group_id, member_id)` (single record per group-member)
    - Indexes on `group_id`, `member_id`, `created_at`, `payout_month`, `payment_method`, `sender_bank`, `receiver_bank`
    - CHECK `payouts_bank_requirements_chk` enforces: when `payment_method = 'bank_transfer'`, both `sender_bank` and `receiver_bank` must be non-null.

- `banks`
  - Standard `id`, `name`, `short_name`, `address`, timestamps, policies. Used to populate dropdowns and store FK references for payouts.

### Migrations

- `database-migration-payouts-table.sql`: creates the base `payouts` table with RLS and indexes.
- `database-migration-banks.sql`: creates the `banks` table with policies and seed.
- `database-migration-add-payout-payment-fields.sql`: adds payment fields to `payouts` and backfills existing rows.
  - Adds `payment_method`, `sender_bank`, `receiver_bank`, `notes`
  - Backfill step sets `payment_method = 'cash'` for rows that have no banks
  - Adds the `payouts_bank_requirements_chk` CHECK

Row Level Security (RLS) is enabled for both tables, with policies mirroring the rest of the app (see migration files for specifics).

---

## Types

File: `src/types/payout.ts`

- `Payout` (list row data used by the table)
- `PayoutDetails` (modal data used for save/update)
  - New payment fields:
    - `paymentMethod: 'bank_transfer' | 'cash'`
    - `senderBankId: number | null`
    - `receiverBankId: number | null`
    - `notes?: string`

Other utility types: `FilterType`, `StatusFilter`, `SortField`, `SortDirection`.

---

## Services

### payoutService
File: `src/services/payoutService.ts`

- `getAllPayouts(month?: string): Promise<Payout[]>`
  - Fetches groups with members who have an assigned month equal to `month`
  - Joins to build a `Payout[]` for the UI table (member/group names, amounts, bank info)
  - Reads additional per-member data from Supabase tables `groups`, `group_members`, `members`

### payoutDetailsService
File: `src/services/payoutDetailsService.ts`

- `getPayoutDetails(groupId, memberId): Promise<PayoutDetails | null>`
  - Loads the most recent `payouts` row for the given group/member
  - Maps DB columns to `PayoutDetails`

- `savePayoutDetails(payoutDetails: PayoutDetails): Promise<PayoutDetails>`
  - Insert if `id` is absent, else update
  - Persists last slot, admin fee, additional cost, payout date, payout month, payout status, and the new payment fields
  - When `paymentMethod = 'cash'`, `sender_bank` and `receiver_bank` are saved as nulls

### bankService
File: `src/services/bankService.ts`

- `getAllBanks(): Promise<Bank[]>`
  - Reads `banks` table via Supabase (`.from('banks').select('*').order('name')`)
  - Used to populate the two bank dropdowns in the modal

---

## UI Flow (Payouts Page)

File: `src/pages/Payouts.tsx`

1. Table of payouts with filters, pagination, and sorting.
2. Clicking the eye icon opens the Payout Details modal for a row.
3. The modal loads `PayoutDetails` (or creates defaults) and shows sections:
   - Group Information
   - Recipient Information
   - Payment Information (new)
     - Toggle between `Bank Transfer` and `Cash`
     - When `Bank Transfer`:
       - Show and enable two dropdowns for banks
       - Require both banks before saving (Save button disabled until selected)
     - When `Cash`:
       - Hide/disable and clear bank dropdowns
     - Optional notes (max 100 chars)
   - Deductions (Last Slot, Administration Fee, Additional Cost)
   - Calculation Breakdown (base, deductions, subtotal, additional cost, total)

4. Actions in modal footer:
   - Save/Update: persists `PayoutDetails` including new payment fields
   - Payout/Undo Payout: toggles the `payout` boolean field
   - Save PDF: generates a signed PDF snapshot including Payment Information

### Validation and Defaults
- Default payment method: `bank_transfer` for new entries (per feature spec)
- Existing rows: treated as `cash` (handled in migration backfill)
- When payment method is `bank_transfer`, both banks are required to Save
- Notes are optional, truncated at 100 characters in the UI

### Banks Dropdowns
- Data loaded from `bankService.getAllBanks()`
- Values saved as `banks.id` (FK); labels display bank `name`

### i18n
- Labels use `LanguageContext` via `t()` with a `tt(key, fallback)` helper in `Payouts.tsx`
- If a translation key is missing, the UI falls back to a friendly label (Title Case)

---

## PDF Generation

File: `src/services/pdfService.ts`

- `generatePayoutPDF(
  payout,
  lastSlotPaid,
  adminFeePaid,
  settledDeductionAmount,
  additionalCost,
  payoutDate,
  paymentInfo?
)`

Adds these sections, in order:
1. Title, date, logo (if available)
2. Group Information
3. Recipient Information
4. Payment Information (new)
   - Method (Bank Transfer/Cash)
   - When Bank Transfer: `Sranan Kasmoni's Bank`, `Recipient's Bank`
   - Notes (when present)
5. Calculation Breakdown
   - Base Amount, Settled Deduction, Last Slot Deduction, Admin Fee Deduction
   - Sub-total, Additional Cost, Total Amount

The `Save PDF` button in `Payouts.tsx` maps selected `senderBankId`/`receiverBankId` to names and passes them with `paymentMethod` and `notes` in `paymentInfo`.

---

## API (Supabase Queries)

This feature uses Supabase client-side queries (no custom backend routes) to read/write data:

- Fetch Payouts data for the table: `payoutService.getAllPayouts(month)`
  - Reads `groups`, `group_members`, `members` and composes `Payout[]`

- Read/Write Payout Details: `payoutDetailsService`
  - `.from('payouts').select('*')` with filters on `group_id`, `member_id`
  - `.from('payouts').insert({...})` / `.update({...}).eq('id', ...)`

- List Banks: `bankService.getAllBanks()`
  - `.from('banks').select('*').order('name')`

Security is enforced through RLS policies defined in the migrations. Adjust policies as needed for your deployment.

---

## How to Add/Modify Payouts

1. Open Payouts page and locate a member row.
2. Click View (eye icon) to open modal.
3. Confirm/adjust Payment Information:
   - Choose payment method
   - When Bank Transfer, select both banks
   - Optionally add notes
4. Adjust Deductions if necessary:
   - Last Slot, Administration Fee, Additional Cost
5. Set Payout Date.
6. Click Save/Update to persist.
7. Click Payout to mark as paid or Undo Payout to revert.
8. Click Save PDF to generate the payout document including Payment Information and the calculation breakdown.

---

## Data Defaults and Backward Compatibility

- Existing records are treated as `cash` and will not require banks.
- New records default to `bank_transfer`. The UI enforces bank selection before saving.
- The CHECK constraint guarantees data consistency server-side for `bank_transfer` rows.

---

## Troubleshooting

- CHECK constraint errors when running the migration
  - Ensure backfill step runs before adding the CHECK (this repo’s migration already does this).
  - Alternatively, add the CHECK as `NOT VALID` and `VALIDATE CONSTRAINT` after fixing data.

- Banks not appearing in dropdowns
  - Verify `banks` table has data and RLS allows SELECT.
  - Confirm `bankService.getAllBanks()` is reachable and not failing due to auth.

- PDF missing Payment Information
  - Ensure `Save PDF` is clicked from the modal after selecting Payment Information.
  - Confirm `pdfService.generatePayoutPDF` includes the `paymentInfo` object.

---

## Files Touched by This Feature

- Database:
  - `database-migration-payouts-table.sql`
  - `database-migration-banks.sql`
  - `database-migration-add-payout-payment-fields.sql`

- Types/Services:
  - `src/types/payout.ts`
  - `src/services/payoutService.ts`
  - `src/services/payoutDetailsService.ts`
  - `src/services/bankService.ts`
  - `src/services/pdfService.ts`

- UI:
  - `src/pages/Payouts.tsx`
  - `src/pages/Payouts.css`

---

## Future Enhancements

- Add server-side endpoints for audited payout mutations
- Add export/report endpoints including the new payment fields
- Add user activity logs when payout status changes or PDF is generated
- Add per-group configurable admin fee


