CREATE TABLE IF NOT EXISTS "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"inviter_user_id" integer,
	"inviter_display_name" text NOT NULL,
	"invitee_email" text NOT NULL,
	"invitee_display_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"invite_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	CONSTRAINT "invitations_invite_token_unique" UNIQUE("invite_token")
);

DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
