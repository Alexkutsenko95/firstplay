CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sid" uuid NOT NULL,
	"game" text NOT NULL,
	"platform" text NOT NULL,
	"device" text NOT NULL,
	"step" text NOT NULL,
	"t" integer NOT NULL,
	"seq" integer NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "events_game_received_at_idx" ON "events" USING btree ("game","received_at");