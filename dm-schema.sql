-- DM schema and indexes

create table if not exists dm_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1 uuid not null,
  participant_2 uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure participant ordering uniqueness
create unique index if not exists dm_conversations_participants_key
  on dm_conversations (least(participant_1, participant_2), greatest(participant_1, participant_2));

-- Indexes for inbox lookups
create index if not exists dm_conversations_p1_updated_idx on dm_conversations (participant_1, updated_at desc);
create index if not exists dm_conversations_p2_updated_idx on dm_conversations (participant_2, updated_at desc);

create table if not exists dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references dm_conversations(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz null
);

-- Index for fetching recent messages
create index if not exists dm_messages_conv_created_idx on dm_messages (conversation_id, created_at desc);



