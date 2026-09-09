import { processNewEngagements } from "./modules/engagementActivity/engagementActivity.service";

async function main() {
  console.log("--- processing notes (remote) ---");
  await processNewEngagements("note");
  console.log("--- processing calls (remote) ---");
  await processNewEngagements("call");
  console.log("--- processing meetings (remote) ---");
  await processNewEngagements("meeting");
  console.log("done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
