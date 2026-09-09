import "dotenv/config";
import { app } from "./app";
import { scheduleInvoiceReminderCron } from "./cron/invoiceReminders.cron";
import { scheduleInboundEmailCron } from "./cron/inboundEmail.cron";
import { scheduleEmailActivityCron } from "./cron/emailActivity.cron";
import { scheduleEngagementActivityCron } from "./cron/engagementActivity.cron";

const port = Number(process.env.PORT ?? 80);

app.listen(port, () => {
  console.log(`CRM System running on port ${port}`);
  scheduleInvoiceReminderCron();
  scheduleInboundEmailCron();
  scheduleEmailActivityCron();
  scheduleEngagementActivityCron();
});
