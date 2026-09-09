import cron from "node-cron";
import { runInvoiceDueReminders } from "../modules/notifications/invoiceReminder.service";

// Daily at 8am.
const SCHEDULE = "0 8 * * *";

export function scheduleInvoiceReminderCron(): void {
  cron.schedule(SCHEDULE, () => {
    runInvoiceDueReminders().catch((error) => {
      console.error("Invoice reminder cron run failed", error);
    });
  });

  console.log(`Invoice reminder cron scheduled: ${SCHEDULE}`);
}
