create schema if not exists skillio;

create table if not exists skillio.learning_categories (
  id text primary key,
  title text not null,
  subtitle text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists skillio.user_learning_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  state_payload jsonb not null default '{}'::jsonb,
  xp integer not null default 0,
  mastery integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

alter table skillio.learning_categories enable row level security;
alter table skillio.user_learning_state enable row level security;

drop policy if exists "Authenticated users can read categories" on skillio.learning_categories;
create policy "Authenticated users can read categories" on skillio.learning_categories for select to authenticated using (true);

drop policy if exists "Users can read own learning state" on skillio.user_learning_state;
create policy "Users can read own learning state" on skillio.user_learning_state for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own learning state" on skillio.user_learning_state;
create policy "Users can insert own learning state" on skillio.user_learning_state for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own learning state" on skillio.user_learning_state;
create policy "Users can update own learning state" on skillio.user_learning_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into skillio.learning_categories (id,title,subtitle,status)
values ('change-management','Change Management','Business Transformation, Adoption und Data-Mesh-Transfer.','active')
on conflict (id) do update set title=excluded.title, subtitle=excluded.subtitle, status=excluded.status, updated_at=now();
