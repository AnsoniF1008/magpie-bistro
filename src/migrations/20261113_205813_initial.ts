import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_dishes_category" AS ENUM('ENTREE', 'BOWL', 'SANDWICH', 'SOUP', 'SALAD', 'DESSERT', 'DRINK');
  CREATE TYPE "public"."enum__dishes_v_version_category" AS ENUM('ENTREE', 'BOWL', 'SANDWICH', 'SOUP', 'SALAD', 'DESSERT', 'DRINK');
  CREATE TYPE "public"."enum_menu_slots_weekday" AS ENUM('1', '2', '3', '4', '5', '6', '7');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED');
  CREATE TYPE "public"."enum_orders_payment_mode" AS ENUM('stripe', 'demo');
  CREATE TYPE "public"."enum_custom_cake_requests_kind" AS ENUM('CUSTOM', 'HOLIDAY');
  CREATE TYPE "public"."enum_custom_cake_requests_status" AS ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAID');
  CREATE TYPE "public"."enum_users_role" AS ENUM('OWNER', 'STAFF');
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('create', 'update', 'delete');
  CREATE TYPE "public"."enum_site_settings_open_weekdays" AS ENUM('1', '2', '3', '4', '5', '6', '7');
  CREATE TABLE "dishes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name_en" varchar NOT NULL,
  	"name_es" varchar,
  	"price_cents" numeric,
  	"category" "enum_dishes_category" DEFAULT 'ENTREE' NOT NULL,
  	"image_id" integer,
  	"desc_en" varchar,
  	"desc_es" varchar,
  	"is_sold_out" boolean DEFAULT false,
  	"is_visible" boolean DEFAULT true,
  	"is_orderable" boolean DEFAULT true,
  	"is_signature" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 100,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "dishes_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_dishes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name_en" varchar NOT NULL,
  	"version_name_es" varchar,
  	"version_price_cents" numeric,
  	"version_category" "enum__dishes_v_version_category" DEFAULT 'ENTREE' NOT NULL,
  	"version_image_id" integer,
  	"version_desc_en" varchar,
  	"version_desc_es" varchar,
  	"version_is_sold_out" boolean DEFAULT false,
  	"version_is_visible" boolean DEFAULT true,
  	"version_is_orderable" boolean DEFAULT true,
  	"version_is_signature" boolean DEFAULT false,
  	"version_sort_order" numeric DEFAULT 100,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_dishes_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "menu_slots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dish_id" integer NOT NULL,
  	"weekday" "enum_menu_slots_weekday" NOT NULL,
  	"week_of" varchar,
  	"position" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt_en" varchar NOT NULL,
  	"alt_es" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"dish_id" integer,
  	"name_snap" varchar NOT NULL,
  	"qty" numeric NOT NULL,
  	"unit_cents" numeric NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"status" "enum_orders_status" DEFAULT 'PENDING' NOT NULL,
  	"customer_name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar,
  	"pickup_at" timestamp(3) with time zone NOT NULL,
  	"notes" varchar,
  	"subtotal_cents" numeric NOT NULL,
  	"tax_cents" numeric NOT NULL,
  	"total_cents" numeric NOT NULL,
  	"allergy_ack_at" timestamp(3) with time zone,
  	"payment_mode" "enum_orders_payment_mode",
  	"stripe_id" varchar,
  	"confirmed_at" timestamp(3) with time zone,
  	"public_token" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "custom_cake_requests_holiday_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"option" varchar,
  	"qty" numeric,
  	"unit_cents" numeric
  );
  
  CREATE TABLE "custom_cake_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"kind" "enum_custom_cake_requests_kind" DEFAULT 'CUSTOM' NOT NULL,
  	"status" "enum_custom_cake_requests_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
  	"quote_cents" numeric,
  	"owner_note" varchar,
  	"rejection_reason" varchar,
  	"customer_name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"desired_date" timestamp(3) with time zone NOT NULL,
  	"product_type" varchar,
  	"size" varchar,
  	"flavor" varchar,
  	"decoration" varchar,
  	"message" varchar,
  	"reference_url" varchar,
  	"campaign_id" integer,
  	"order_total_cents" numeric,
  	"notes" varchar,
  	"stripe_id" varchar,
  	"paid_at" timestamp(3) with time zone,
  	"public_token" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "holiday_campaigns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"detail" varchar,
  	"price_cents" numeric NOT NULL
  );
  
  CREATE TABLE "holiday_campaigns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"order_by_at" timestamp(3) with time zone NOT NULL,
  	"pickup_at" timestamp(3) with time zone NOT NULL,
  	"deposit_percent" numeric DEFAULT 50 NOT NULL,
  	"intro" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "holiday_campaigns_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'STAFF' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" "enum_audit_log_action" NOT NULL,
  	"collection_slug" varchar NOT NULL,
  	"doc_id" varchar NOT NULL,
  	"doc_title" varchar,
  	"user_email" varchar,
  	"user_id" integer,
  	"summary" varchar,
  	"changes" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"dishes_id" integer,
  	"menu_slots_id" integer,
  	"media_id" integer,
  	"orders_id" integer,
  	"custom_cake_requests_id" integer,
  	"holiday_campaigns_id" integer,
  	"users_id" integer,
  	"audit_log_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_open_weekdays" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_site_settings_open_weekdays",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"manual_closed" boolean DEFAULT false,
  	"closed_message" varchar,
  	"open_time" varchar DEFAULT '11:30' NOT NULL,
  	"close_time" varchar DEFAULT '16:30' NOT NULL,
  	"banner_en" varchar,
  	"banner_es" varchar,
  	"hero_image_id" integer,
  	"hero_caption" varchar,
  	"cupcakery_image_id" integer,
  	"online_ordering" boolean DEFAULT true,
  	"tax_rate_percent" numeric DEFAULT 5.3 NOT NULL,
  	"cake_lead_days" numeric DEFAULT 3 NOT NULL,
  	"notification_email" varchar,
  	"phone" varchar DEFAULT '(757) 339-2423' NOT NULL,
  	"email" varchar DEFAULT 'themagpiecupcakery@gmail.com' NOT NULL,
  	"address_line1" varchar DEFAULT '1604 S Church Street, Suite B' NOT NULL,
  	"address_line2" varchar DEFAULT 'Smithfield, VA 23430' NOT NULL,
  	"facebook_url" varchar DEFAULT 'https://www.facebook.com/p/The-Magpie-Bistro-Cupcakery-61556549097960/',
  	"instagram_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "dishes" ADD CONSTRAINT "dishes_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dishes_texts" ADD CONSTRAINT "dishes_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dishes_v" ADD CONSTRAINT "_dishes_v_parent_id_dishes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dishes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dishes_v" ADD CONSTRAINT "_dishes_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dishes_v_texts" ADD CONSTRAINT "_dishes_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_dishes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_slots" ADD CONSTRAINT "menu_slots_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "custom_cake_requests_holiday_items" ADD CONSTRAINT "custom_cake_requests_holiday_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."custom_cake_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "custom_cake_requests" ADD CONSTRAINT "custom_cake_requests_campaign_id_holiday_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."holiday_campaigns"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "holiday_campaigns_items" ADD CONSTRAINT "holiday_campaigns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."holiday_campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "holiday_campaigns_texts" ADD CONSTRAINT "holiday_campaigns_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."holiday_campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dishes_fk" FOREIGN KEY ("dishes_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_menu_slots_fk" FOREIGN KEY ("menu_slots_id") REFERENCES "public"."menu_slots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_custom_cake_requests_fk" FOREIGN KEY ("custom_cake_requests_id") REFERENCES "public"."custom_cake_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_holiday_campaigns_fk" FOREIGN KEY ("holiday_campaigns_id") REFERENCES "public"."holiday_campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_open_weekdays" ADD CONSTRAINT "site_settings_open_weekdays_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_cupcakery_image_id_media_id_fk" FOREIGN KEY ("cupcakery_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "dishes_image_idx" ON "dishes" USING btree ("image_id");
  CREATE UNIQUE INDEX "dishes_slug_idx" ON "dishes" USING btree ("slug");
  CREATE INDEX "dishes_updated_at_idx" ON "dishes" USING btree ("updated_at");
  CREATE INDEX "dishes_created_at_idx" ON "dishes" USING btree ("created_at");
  CREATE INDEX "dishes_texts_order_parent" ON "dishes_texts" USING btree ("order","parent_id");
  CREATE INDEX "_dishes_v_parent_idx" ON "_dishes_v" USING btree ("parent_id");
  CREATE INDEX "_dishes_v_version_version_image_idx" ON "_dishes_v" USING btree ("version_image_id");
  CREATE INDEX "_dishes_v_version_version_slug_idx" ON "_dishes_v" USING btree ("version_slug");
  CREATE INDEX "_dishes_v_version_version_updated_at_idx" ON "_dishes_v" USING btree ("version_updated_at");
  CREATE INDEX "_dishes_v_version_version_created_at_idx" ON "_dishes_v" USING btree ("version_created_at");
  CREATE INDEX "_dishes_v_created_at_idx" ON "_dishes_v" USING btree ("created_at");
  CREATE INDEX "_dishes_v_updated_at_idx" ON "_dishes_v" USING btree ("updated_at");
  CREATE INDEX "_dishes_v_texts_order_parent" ON "_dishes_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "menu_slots_dish_idx" ON "menu_slots" USING btree ("dish_id");
  CREATE INDEX "menu_slots_week_of_idx" ON "menu_slots" USING btree ("week_of");
  CREATE INDEX "menu_slots_updated_at_idx" ON "menu_slots" USING btree ("updated_at");
  CREATE INDEX "menu_slots_created_at_idx" ON "menu_slots" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_dish_idx" ON "orders_items" USING btree ("dish_id");
  CREATE UNIQUE INDEX "orders_code_idx" ON "orders" USING btree ("code");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_pickup_at_idx" ON "orders" USING btree ("pickup_at");
  CREATE INDEX "orders_stripe_id_idx" ON "orders" USING btree ("stripe_id");
  CREATE INDEX "orders_public_token_idx" ON "orders" USING btree ("public_token");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "custom_cake_requests_holiday_items_order_idx" ON "custom_cake_requests_holiday_items" USING btree ("_order");
  CREATE INDEX "custom_cake_requests_holiday_items_parent_id_idx" ON "custom_cake_requests_holiday_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "custom_cake_requests_code_idx" ON "custom_cake_requests" USING btree ("code");
  CREATE INDEX "custom_cake_requests_status_idx" ON "custom_cake_requests" USING btree ("status");
  CREATE INDEX "custom_cake_requests_campaign_idx" ON "custom_cake_requests" USING btree ("campaign_id");
  CREATE INDEX "custom_cake_requests_stripe_id_idx" ON "custom_cake_requests" USING btree ("stripe_id");
  CREATE INDEX "custom_cake_requests_public_token_idx" ON "custom_cake_requests" USING btree ("public_token");
  CREATE INDEX "custom_cake_requests_updated_at_idx" ON "custom_cake_requests" USING btree ("updated_at");
  CREATE INDEX "custom_cake_requests_created_at_idx" ON "custom_cake_requests" USING btree ("created_at");
  CREATE INDEX "holiday_campaigns_items_order_idx" ON "holiday_campaigns_items" USING btree ("_order");
  CREATE INDEX "holiday_campaigns_items_parent_id_idx" ON "holiday_campaigns_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "holiday_campaigns_slug_idx" ON "holiday_campaigns" USING btree ("slug");
  CREATE INDEX "holiday_campaigns_updated_at_idx" ON "holiday_campaigns" USING btree ("updated_at");
  CREATE INDEX "holiday_campaigns_created_at_idx" ON "holiday_campaigns" USING btree ("created_at");
  CREATE INDEX "holiday_campaigns_texts_order_parent" ON "holiday_campaigns_texts" USING btree ("order","parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "audit_log_collection_slug_idx" ON "audit_log" USING btree ("collection_slug");
  CREATE INDEX "audit_log_doc_id_idx" ON "audit_log" USING btree ("doc_id");
  CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_dishes_id_idx" ON "payload_locked_documents_rels" USING btree ("dishes_id");
  CREATE INDEX "payload_locked_documents_rels_menu_slots_id_idx" ON "payload_locked_documents_rels" USING btree ("menu_slots_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_custom_cake_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("custom_cake_requests_id");
  CREATE INDEX "payload_locked_documents_rels_holiday_campaigns_id_idx" ON "payload_locked_documents_rels" USING btree ("holiday_campaigns_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_open_weekdays_order_idx" ON "site_settings_open_weekdays" USING btree ("order");
  CREATE INDEX "site_settings_open_weekdays_parent_idx" ON "site_settings_open_weekdays" USING btree ("parent_id");
  CREATE INDEX "site_settings_hero_image_idx" ON "site_settings" USING btree ("hero_image_id");
  CREATE INDEX "site_settings_cupcakery_image_idx" ON "site_settings" USING btree ("cupcakery_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "dishes" CASCADE;
  DROP TABLE "dishes_texts" CASCADE;
  DROP TABLE "_dishes_v" CASCADE;
  DROP TABLE "_dishes_v_texts" CASCADE;
  DROP TABLE "menu_slots" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "custom_cake_requests_holiday_items" CASCADE;
  DROP TABLE "custom_cake_requests" CASCADE;
  DROP TABLE "holiday_campaigns_items" CASCADE;
  DROP TABLE "holiday_campaigns" CASCADE;
  DROP TABLE "holiday_campaigns_texts" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_open_weekdays" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_dishes_category";
  DROP TYPE "public"."enum__dishes_v_version_category";
  DROP TYPE "public"."enum_menu_slots_weekday";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_payment_mode";
  DROP TYPE "public"."enum_custom_cake_requests_kind";
  DROP TYPE "public"."enum_custom_cake_requests_status";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_audit_log_action";
  DROP TYPE "public"."enum_site_settings_open_weekdays";`)
}
