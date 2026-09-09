import cron from "node-cron";
import { processNewEngagements } from "../modules/engagementActivity/engagementActivity.service";
import type { EngagementType } from "../modules/engagementActivity/engagementActivity.repository";

const DEFAULT_SCHEDULE = "*/5 * * * *";
const ENGAGEMENT_TYPES: EngagementType[] = ["note", "call", "meeting"];

export function scheduleEngagementActivityCron(): void {
  const schedule = process.env.ENGAGEMENT_ACTIVITY_CRON_SCHEDULE ?? DEFAULT_SCHEDULE;

  cron.schedule(schedule, () => {
    for (const type of ENGAGEMENT_TYPES) {
      processNewEngagements(type).catch((error) => {
        console.error(`Engagement activity cron run failed (${type})`, error);
      });
    }
  });

  console.log(`Engagement activity cron scheduled: ${schedule}`);
}
