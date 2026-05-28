CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`date` integer NOT NULL,
	`is_present` integer DEFAULT true,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action_type` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer,
	`old_value` text,
	`new_value` text,
	`timestamp` integer,
	`ip_address` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `child_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `children` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`birth_date` integer NOT NULL,
	`group_id` integer,
	`status` text DEFAULT 'active',
	FOREIGN KEY (`group_id`) REFERENCES `child_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_menus` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` integer NOT NULL,
	`children_count_0_4` integer NOT NULL,
	`children_count_5_7` integer NOT NULL,
	`target_price_0_4` real,
	`target_price_5_7` real,
	`is_confirmed` integer DEFAULT false,
	`confirmed_at` integer
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_number` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`location` text,
	`responsible_id` integer,
	`initial_value` real,
	`status` text DEFAULT 'good',
	`arrival_date` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_inventory_number_unique` ON `inventory` (`inventory_number`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`date` integer NOT NULL,
	`supplier_id` integer NOT NULL,
	`total_amount` real NOT NULL,
	`is_draft` integer DEFAULT false,
	`created_at` integer,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menu_item_recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_id` integer NOT NULL,
	`recipe_id` integer NOT NULL,
	`meal_type` text NOT NULL,
	FOREIGN KEY (`menu_id`) REFERENCES `daily_menus`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`arrival_date` integer NOT NULL,
	`initial_quantity` real NOT NULL,
	`remaining_quantity` real NOT NULL,
	`price_per_unit` real NOT NULL,
	`invoice_id` integer,
	`expiry_date` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`price` real NOT NULL,
	`change_date` integer,
	`reason` text NOT NULL,
	`reference_id` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`current_price` real DEFAULT 0,
	`min_stock` real DEFAULT 0,
	`category` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`product_id` integer,
	`sub_recipe_id` integer,
	`age_group` text NOT NULL,
	`gross_weight` real NOT NULL,
	`net_weight` real NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`dish_type` text,
	`tech_card` text,
	`output_weight` real,
	`is_base_recipe` integer DEFAULT false,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`batch_id` integer,
	`type` text NOT NULL,
	`quantity` real NOT NULL,
	`price_at_moment` real NOT NULL,
	`date` integer,
	`reason` text,
	`user_id` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `product_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`edrpou` text,
	`contacts` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`permissions` text,
	`is_active` integer DEFAULT true,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);