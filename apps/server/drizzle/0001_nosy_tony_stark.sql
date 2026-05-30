CREATE TABLE `child_medical_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`blood_group` text,
	`rh_factor` text,
	`health_group` text,
	`physical_group` text,
	`chronic_conditions` text,
	`allergies` text,
	`dietary_restrictions` text,
	`height` real,
	`weight` real,
	`created_at` integer,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `child_medical_cards_child_id_unique` ON `child_medical_cards` (`child_id`);--> statement-breakpoint
CREATE TABLE `child_medical_measurements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`height` real,
	`weight` real,
	`measured_at` integer NOT NULL,
	`notes` text,
	`created_by_user_id` integer,
	`created_at` integer,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `child_psychological_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`temperament` text,
	`adaptation_level` text,
	`speech_development` text,
	`social_skills` text,
	`family_status` text,
	`notes` text,
	`recommendations` text,
	`created_at` integer,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `child_psychological_cards_child_id_unique` ON `child_psychological_cards` (`child_id`);--> statement-breakpoint
CREATE TABLE `employee_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`title` text NOT NULL,
	`document_type` text NOT NULL,
	`document_number` text,
	`file_name` text,
	`original_file_name` text,
	`file_path` text,
	`mime_type` text,
	`file_size` integer,
	`issue_date` integer,
	`notes` text,
	`created_at` integer,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `employee_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`user_id` integer,
	`created_at` integer,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`position` text NOT NULL,
	`department` text,
	`phone` text,
	`email` text,
	`address` text,
	`hire_date` integer,
	`rate` real,
	`notes` text,
	`user_id` integer,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `illnesses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`diagnosis` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`quarantine_end_date` integer,
	`isolation_ward` integer DEFAULT false,
	`notes` text,
	`created_at` integer,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory_transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`from_employee_id` integer,
	`to_employee_id` integer,
	`from_assignment_type` text,
	`to_assignment_type` text,
	`from_group_id` integer,
	`to_group_id` integer,
	`from_outdoor_area` text,
	`to_outdoor_area` text,
	`note` text,
	`transferred_by_user_id` integer,
	`transferred_at` integer,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_group_id`) REFERENCES `child_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_group_id`) REFERENCES `child_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transferred_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`expiry_date` integer,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kindergarten_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT 'Заклад дошкільної освіти' NOT NULL,
	`edrpou` text DEFAULT '00000000',
	`address` text DEFAULT 'Адреса закладу',
	`phone` text DEFAULT '+380000000000',
	`email` text DEFAULT 'email@example.com',
	`director_name` text DEFAULT 'ПІБ Директора',
	`nurse_name` text DEFAULT 'ПІБ Медсестри',
	`storekeeper_name` text DEFAULT 'ПІБ Комірника (Кладовщика)',
	`supply_manager_name` text DEFAULT 'ПІБ Завгоспа',
	`show_quotes` integer DEFAULT true,
	`license_key` text,
	`license_type` text,
	`installation_date` integer,
	`activated_at` integer
);
--> statement-breakpoint
CREATE TABLE `medication_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`medication_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity` real NOT NULL,
	`date` integer NOT NULL,
	`reason` text,
	`child_id` integer,
	`user_id` integer,
	`created_at` integer,
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`expiry_date` integer,
	`notes` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `menu_item_ingredient_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_item_id` integer NOT NULL,
	`recipe_ingredient_id` integer,
	`product_id` integer,
	`sub_recipe_id` integer,
	`age_group` text,
	`gross_weight` real NOT NULL,
	`net_weight` real NOT NULL,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_item_recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_ingredient_id`) REFERENCES `recipe_ingredients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` integer NOT NULL,
	`recipient_id` integer,
	`group_id` text,
	`content` text NOT NULL,
	`is_read` integer DEFAULT false,
	`timestamp` integer,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `psychological_consultations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer,
	`consultation_type` text DEFAULT 'child_individual' NOT NULL,
	`topic` text NOT NULL,
	`participants` text,
	`notes` text,
	`date` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `utility_meter_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meter_id` integer NOT NULL,
	`reading_value` real NOT NULL,
	`reading_date` integer NOT NULL,
	`notes` text,
	`created_by_user_id` integer,
	`created_at` integer,
	FOREIGN KEY (`meter_id`) REFERENCES `utility_meters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `utility_meters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`utility_type` text NOT NULL,
	`unit` text NOT NULL,
	`location` text,
	`account_number` text,
	`notes` text,
	`is_active` integer DEFAULT true,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `utility_tariffs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meter_id` integer NOT NULL,
	`price_per_unit` real NOT NULL,
	`fixed_fee` real DEFAULT 0 NOT NULL,
	`valid_from` integer NOT NULL,
	`notes` text,
	`created_at` integer,
	FOREIGN KEY (`meter_id`) REFERENCES `utility_meters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `vaccinations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`vaccine_name` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`plan_date` integer,
	`date_given` integer,
	`notes` text,
	`created_at` integer,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_menu_item_recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_id` integer NOT NULL,
	`recipe_id` integer NOT NULL,
	`meal_type` text NOT NULL,
	`output_weight_0_4` real,
	`output_weight_5_7` real,
	FOREIGN KEY (`menu_id`) REFERENCES `daily_menus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_menu_item_recipes`("id", "menu_id", "recipe_id", "meal_type", "output_weight_0_4", "output_weight_5_7") SELECT "id", "menu_id", "recipe_id", "meal_type", "output_weight_0_4", "output_weight_5_7" FROM `menu_item_recipes`;--> statement-breakpoint
DROP TABLE `menu_item_recipes`;--> statement-breakpoint
ALTER TABLE `__new_menu_item_recipes` RENAME TO `menu_item_recipes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`date` integer NOT NULL,
	`supplier_id` integer NOT NULL,
	`basis` text,
	`vat_amount` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`is_draft` integer DEFAULT false,
	`status` text DEFAULT 'draft' NOT NULL,
	`posted_at` integer,
	`created_by` integer,
	`created_at` integer,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_invoices`("id", "invoice_number", "date", "supplier_id", "basis", "vat_amount", "total_amount", "is_draft", "status", "posted_at", "created_by", "created_at") SELECT "id", "invoice_number", "date", "supplier_id", "basis", "vat_amount", "total_amount", "is_draft", "status", "posted_at", "created_by", "created_at" FROM `invoices`;--> statement-breakpoint
DROP TABLE `invoices`;--> statement-breakpoint
ALTER TABLE `__new_invoices` RENAME TO `invoices`;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`current_price` real DEFAULT 0 NOT NULL,
	`min_stock` real DEFAULT 0 NOT NULL,
	`category` text,
	`notes` text,
	`is_archived` integer DEFAULT false,
	`created_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "name", "unit", "current_price", "min_stock", "category", "notes", "is_archived", "created_at") SELECT "id", "name", "unit", "current_price", "min_stock", "category", "notes", "is_archived", "created_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
ALTER TABLE `child_groups` ADD `primary_educator_id` integer REFERENCES employees(id);--> statement-breakpoint
ALTER TABLE `child_groups` ADD `assistant_educator_id` integer REFERENCES employees(id);--> statement-breakpoint
ALTER TABLE `children` ADD `qr_token` text;--> statement-breakpoint
ALTER TABLE `children` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `children` ADD `address` text;--> statement-breakpoint
ALTER TABLE `children` ADD `document_info` text;--> statement-breakpoint
ALTER TABLE `children` ADD `mother_name` text;--> statement-breakpoint
ALTER TABLE `children` ADD `mother_phone` text;--> statement-breakpoint
ALTER TABLE `children` ADD `father_name` text;--> statement-breakpoint
ALTER TABLE `children` ADD `father_phone` text;--> statement-breakpoint
ALTER TABLE `children` ADD `has_benefits` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `children` ADD `benefit_description` text;--> statement-breakpoint
ALTER TABLE `children` ADD `photo_path` text;--> statement-breakpoint
ALTER TABLE `children` ADD `enrollment_date` integer;--> statement-breakpoint
ALTER TABLE `children` ADD `notes` text;--> statement-breakpoint
CREATE UNIQUE INDEX `children_qr_token_unique` ON `children` (`qr_token`);--> statement-breakpoint
ALTER TABLE `inventory` ADD `assignment_type` text DEFAULT 'employee' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory` ADD `group_id` integer REFERENCES child_groups(id);--> statement-breakpoint
ALTER TABLE `inventory` ADD `outdoor_area` text;--> statement-breakpoint
ALTER TABLE `inventory` ADD `notes` text;--> statement-breakpoint
CREATE TABLE `__new_product_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`arrival_date` integer NOT NULL,
	`initial_quantity` real NOT NULL,
	`remaining_quantity` real NOT NULL,
	`price_per_unit` real NOT NULL,
	`invoice_id` integer,
	`invoice_item_id` integer,
	`expiry_date` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_product_batches`("id", "product_id", "arrival_date", "initial_quantity", "remaining_quantity", "price_per_unit", "invoice_id", "invoice_item_id", "expiry_date") SELECT "id", "product_id", "arrival_date", "initial_quantity", "remaining_quantity", "price_per_unit", "invoice_id", "invoice_item_id", "expiry_date" FROM `product_batches`;--> statement-breakpoint
DROP TABLE `product_batches`;--> statement-breakpoint
ALTER TABLE `__new_product_batches` RENAME TO `product_batches`;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `invoice_id` integer REFERENCES invoices(id);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `email` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `address` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `is_archived` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `created_at` integer;