-- Create share_links table for token-based sharing
CREATE TABLE chest.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  name TEXT, -- Optional: user-friendly name for the share
  expires_at TIMESTAMPTZ NOT NULL, -- Custom expiration date (required)
  date_from DATE, -- Optional: filter events from this date
  date_to DATE, -- Optional: filter events until this date
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_links_token ON chest.share_links(token);
CREATE INDEX idx_share_links_user_id ON chest.share_links(user_id);
CREATE INDEX idx_share_links_expires_at ON chest.share_links(expires_at);
