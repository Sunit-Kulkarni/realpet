CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  species TEXT NOT NULL,        -- 'blob' | 'cat' | 'dragon'
  personality TEXT NOT NULL,    -- 'grumpy' | 'anxious' | 'theatrical' | 'chill'
  hunger INT NOT NULL DEFAULT 50,     -- 0=stuffed, 100=starving
  happiness INT NOT NULL DEFAULT 50,  -- 0=miserable, 100=ecstatic
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,           -- 'fed' | 'played' | 'thought' | 'tick'
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON events (pet_id, created_at DESC);
