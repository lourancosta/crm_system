import cron from "node-cron";
import { pollAllSupportInboxes } from "../modules/supportInbox/inboundEmail.poller";

// Every 5 minutes.
const SCHEDULE = "*/5 * * * *";

export function scheduleInboundEmailCron(): void {
  cron.schedule(SCHEDULE, () => {
    pollAllSupportInboxes().catch((error) => {
      console.error("Inbound email cron run failed", error);
    });
  });

  console.log(`Inbound email cron scheduled: ${SCHEDULE}`);
}
