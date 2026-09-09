import cron from "node-cron";
import { processNewEmails } from "../modules/emailActivity/emailActivity.service";

const DEFAULT_SCHEDULE = "*/5 * * * *";

export function scheduleEmailActivityCron(): void {
  const schedule = process.env.EMAIL_ACTIVITY_CRON_SCHEDULE ?? DEFAULT_SCHEDULE;

  cron.schedule(schedule, () => {
    processNewEmails().catch((error) => {
      console.error("Email activity cron run failed", error);
    });
  });

  console.log(`Email activity cron scheduled: ${schedule}`);
}
