-- ============================================================
-- Project Team, Time Logs, Specifications & BOM
-- ============================================================

-- ============================================================
-- PROJECT TEAM
-- ============================================================
create table if not exists public.project_team (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  project_id       uuid not null references public.projects(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             text not null default 'member'
                     check (role in ('owner', 'architect', 'engineer', 'contractor', 'member')),
  hours_allocated  numeric(8,2) not null default 0,
  notes            text,
  joined_at        timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (project_id, user_id)
);

-- ============================================================
-- TIME LOGS
-- ============================================================
create table if not exists public.time_logs (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  project_id       uuid not null references public.projects(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null default current_date,
  hours            numeric(6,2) not null check (hours > 0),
  description      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- PROJECT SPECIFICATIONS
-- ============================================================
create table if not exists public.project_specifications (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  project_id       uuid not null references public.projects(id) on delete cascade,
  name             text not null,
  section          text not null default '',
  content          text not null default '',
  notes            text,
  sort_order       integer not null default 0,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- PROJECT BOM (Bill of Materials)
-- ============================================================
create table if not exists public.project_bom (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  project_id       uuid not null references public.projects(id) on delete cascade,
  category         text not null default '',
  item_name        text not null,
  description      text,
  quantity         numeric(10,3) not null default 1,
  unit             text not null default 'unit',
  unit_price       numeric(14,2),
  currency         text not null default 'ILS',
  total_price      numeric(14,2),
  supplier         text,
  status           text not null default 'pending'
                     check (status in ('pending', 'ordered', 'delivered', 'installed')),
  notes            text,
  sort_order       integer not null default 0,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS (updated_at)
-- ============================================================
create trigger trg_project_team_updated_at
  before update on public.project_team
  for each row execute function public.handle_updated_at();

create trigger trg_time_logs_updated_at
  before update on public.time_logs
  for each row execute function public.handle_updated_at();

create trigger trg_project_specifications_updated_at
  before update on public.project_specifications
  for each row execute function public.handle_updated_at();

create trigger trg_project_bom_updated_at
  before update on public.project_bom
  for each row execute function public.handle_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_project_team_project_id    on public.project_team(project_id);
create index if not exists idx_project_team_user_id       on public.project_team(user_id);
create index if not exists idx_time_logs_project_id       on public.time_logs(project_id);
create index if not exists idx_time_logs_user_id          on public.time_logs(user_id);
create index if not exists idx_time_logs_date             on public.time_logs(date);
create index if not exists idx_project_specs_project_id   on public.project_specifications(project_id);
create index if not exists idx_project_bom_project_id     on public.project_bom(project_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.project_team           enable row level security;
alter table public.time_logs              enable row level security;
alter table public.project_specifications enable row level security;
alter table public.project_bom            enable row level security;

-- project_team
create policy "project_team_read" on public.project_team
  for select using (organization_id = public.user_organization_id());

create policy "project_team_insert" on public.project_team
  for insert with check (organization_id = public.user_organization_id());

create policy "project_team_update" on public.project_team
  for update using (organization_id = public.user_organization_id());

create policy "project_team_delete" on public.project_team
  for delete using (organization_id = public.user_organization_id());

-- time_logs
create policy "time_logs_read" on public.time_logs
  for select using (organization_id = public.user_organization_id());

create policy "time_logs_insert" on public.time_logs
  for insert with check (
    organization_id = public.user_organization_id()
    and user_id = auth.uid()
  );

create policy "time_logs_update" on public.time_logs
  for update using (user_id = auth.uid());

create policy "time_logs_delete" on public.time_logs
  for delete using (user_id = auth.uid());

-- project_specifications
create policy "specs_read" on public.project_specifications
  for select using (organization_id = public.user_organization_id());

create policy "specs_insert" on public.project_specifications
  for insert with check (organization_id = public.user_organization_id());

create policy "specs_update" on public.project_specifications
  for update using (organization_id = public.user_organization_id());

create policy "specs_delete" on public.project_specifications
  for delete using (organization_id = public.user_organization_id());

-- project_bom
create policy "bom_read" on public.project_bom
  for select using (organization_id = public.user_organization_id());

create policy "bom_insert" on public.project_bom
  for insert with check (organization_id = public.user_organization_id());

create policy "bom_update" on public.project_bom
  for update using (organization_id = public.user_organization_id());

create policy "bom_delete" on public.project_bom
  for delete using (organization_id = public.user_organization_id());
