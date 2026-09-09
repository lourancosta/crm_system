import "dotenv/config";
import { runInvoiceDueReminders } from "../modules/notifications/invoiceReminder.service";

runInvoiceDueReminders()
  .then((result) => {
    console.log("Invoice reminder run complete", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Invoice reminder run failed", error);
    process.exit(1);
  });
