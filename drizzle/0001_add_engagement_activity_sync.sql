CREATE TABLE `engagement_activity_sync_state` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`engagement_type` varchar(20) NOT NULL,
	`last_processed_modified_at` datetime,
	`last_processed_id` varchar(36),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `engagement_activity_sync_state_id` PRIMARY KEY(`id`),
	CONSTRAINT `engagement_activity_sync_state_engagement_type_unique` UNIQUE(`engagement_type`)
);
--> statement-breakpoint
CREATE TABLE `processed_hubspot_engagements` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`engagement_type` varchar(20) NOT NULL,
	`engagement_hubspot_id` varchar(255) NOT NULL,
	`activity_group_id` varchar(36) NOT NULL,
	`processed_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `processed_hubspot_engagements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `record_history_activity_group_idx` ON `record_history` (`activity_group_id`) ALGORITHM=INPLACE LOCK=NONE;