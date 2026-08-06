CREATE TABLE "provinces" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region_code" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_region_code_regions_code_fk" FOREIGN KEY ("region_code") REFERENCES "public"."regions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_provinces_region" ON "provinces" USING btree ("region_code");