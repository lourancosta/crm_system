ALTER TABLE `companies` RENAME COLUMN `rainforest_programs` TO `certification_programs`;--> statement-breakpoint
ALTER TABLE `contacts` RENAME COLUMN `certificate_rainforest` TO `certificate_certification`;--> statement-breakpoint
ALTER TABLE `deals` RENAME COLUMN `order_processed_in_rainforest` TO `order_processed_in_certification`;--> statement-breakpoint
ALTER TABLE `deals` RENAME COLUMN `rainforest_modules` TO `certification_modules`;--> statement-breakpoint
ALTER TABLE `partnerships` RENAME COLUMN `rainforest_partner_programs` TO `certification_partner_programs`;