import type { Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db/client';

type DashboardRow = {
  new_contacts_today: number;
  new_companies_today: number;
  new_deals_today: number;
  overdue_invoice_amount: number | null;
  total_contacts: number;
  total_companies: number;
  total_deals: number;
  open_invoices: number;
};

export async function getDashboard(_req: Request, res: Response, next: NextFunction) {
  try {
    // drizzle-orm's mysql2 execute() types its result as the raw
    // ResultSetHeader tuple regardless of the row shape passed as a type
    // param (it can't statically tell a SELECT from an INSERT/UPDATE) — the
    // runtime shape for a SELECT is genuinely [rows, fields], so this cast
    // just corrects the static type to match.
    const [rows] = (await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM contacts WHERE archived = false AND created_at >= CURRENT_DATE) AS new_contacts_today,
        (SELECT COUNT(*) FROM companies WHERE archived = false AND created_at >= CURRENT_DATE) AS new_companies_today,
        (SELECT COUNT(*) FROM deals WHERE archived = false AND createdate >= CURRENT_DATE) AS new_deals_today,
        (
          SELECT COALESCE(SUM(
            hs_balance_due - COALESCE((
              SELECT SUM(cm.hs_amount_credited)
              FROM dynamic_associations da
              JOIN credit_memo cm ON cm.hubspot_id = da.to_hubspot_id
              WHERE da.from_object_type = 'invoices'
                AND da.from_hubspot_id = invoices.hubspot_id
                AND da.to_object_type = 'credit_memos'
                AND cm.archived = false
            ), 0)
          ), 0)
          FROM invoices
          WHERE archived = false AND hs_invoice_status = 'open' AND hs_due_date <= NOW()
        ) AS overdue_invoice_amount,
        (SELECT COUNT(*) FROM contacts WHERE archived = false) AS total_contacts,
        (SELECT COUNT(*) FROM companies WHERE archived = false) AS total_companies,
        (SELECT COUNT(*) FROM deals WHERE archived = false) AS total_deals,
        (SELECT COUNT(*) FROM invoices WHERE archived = false AND hs_invoice_status = 'open') AS open_invoices
    `)) as unknown as [DashboardRow[], unknown];
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}
