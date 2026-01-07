-- Create partners table
CREATE TABLE IF NOT EXISTS chest.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#000000',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying partners by user
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON chest.partners(user_id);

-- Create event_partners join table
CREATE TABLE IF NOT EXISTS chest.event_partners (
    event_id UUID NOT NULL REFERENCES chest.events(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES chest.partners(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, partner_id)
);

-- Index for querying partners for an event
CREATE INDEX IF NOT EXISTS idx_event_partners_event_id ON chest.event_partners(event_id);
-- Index for querying events for a partner
CREATE INDEX IF NOT EXISTS idx_event_partners_partner_id ON chest.event_partners(partner_id);

-- Add columns to share_links table
ALTER TABLE chest.share_links 
ADD COLUMN IF NOT EXISTS included_partner_ids UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS include_no_partner_events BOOLEAN DEFAULT TRUE;

-- Row Level Security (RLS) Policies

-- Partners: Users can only see and modify their own partners
ALTER TABLE chest.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own partners"
ON chest.partners
FOR ALL
USING (auth.uid() = user_id);

-- Event Partners: Users can only see and modify event_partners if they own the event (or via share link logic which is handled in API for now, but RLS good practice)
ALTER TABLE chest.event_partners ENABLE ROW LEVEL SECURITY;

-- Note: Complex RLS for join tables often requires checking the parent table. 
-- For simplicity in this context, we rely on the application logic for strict access control, 
-- but adding a basic check that the event belongs to the user:
CREATE POLICY "Users can manage event partners for their events"
ON chest.event_partners
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM chest.events
        WHERE chest.events.id = chest.event_partners.event_id
        AND chest.events.user_id = auth.uid()
    )
);

-- Grant permissions to service role (if needed explicitly, though usually implicit for admin)
GRANT ALL ON chest.partners TO service_role;
GRANT ALL ON chest.event_partners TO service_role;
