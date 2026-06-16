-- ============================================================
-- Archion — Initial Schema Migration
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create table if not exists public.organizations (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,
  logo_url      text,
  plan          text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name       text,
  avatar_url      text,
  role            text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  email           text,
  phone           text,
  title           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
create table if not exists public.clients (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  address         text,
  company         text,
  notes           text,
  contact_person  text,
  tax_id          text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- PROJECTS
-- ============================================================
create table if not exists public.projects (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  name            text not null,
  description     text,
  status          text not null default 'planning'
                    check (status in ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  budget          numeric(14,2),
  budget_currency text not null default 'ILS',
  start_date      date,
  end_date        date,
  address         text,
  area_sqm        numeric(10,2),
  project_type    text,
  permit_number   text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- TASKS
-- ============================================================
create table if not exists public.tasks (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete cascade,
  title           text not null,
  description     text,
  status          text not null default 'todo'
                    check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority        text not null default 'medium'
                    check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to     uuid references auth.users(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  due_date        date,
  completed_at    timestamptz,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- INVOICES
-- ============================================================
create table if not exists public.invoices (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  project_id      uuid references public.projects(id) on delete set null,
  invoice_number  text not null,
  status          text not null default 'draft'
                    check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date      date not null default current_date,
  due_date        date,
  paid_at         timestamptz,
  subtotal        numeric(14,2) not null default 0,
  tax_rate        numeric(5,2) not null default 17, -- Israeli VAT 17%
  tax_amount      numeric(14,2) not null default 0,
  total           numeric(14,2) not null default 0,
  currency        text not null default 'ILS',
  notes           text,
  terms           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
create table if not exists public.invoice_items (
  id           uuid primary key default uuid_generate_v4(),
  invoice_id   uuid not null references public.invoices(id) on delete cascade,
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit_price   numeric(14,2) not null default 0,
  total        numeric(14,2) not null default 0,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists public.documents (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  name            text not null,
  file_path       text not null,
  file_size       bigint,
  file_type       text,
  category        text,
  tags            text[] not null default '{}',
  uploaded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text,
  data            jsonb not null default '{}'::jsonb,
  read            boolean not null default false,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists public.comments (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete cascade,
  task_id         uuid references public.tasks(id) on delete cascade,
  author_id       uuid not null references auth.users(id) on delete cascade,
  content         text not null,
  edited_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (project_id is not null or task_id is not null)
);

-- ============================================================
-- PROPOSALS
-- ============================================================
create table if not exists public.proposals (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  project_id      uuid references public.projects(id) on delete set null,
  title           text not null,
  description     text,
  status          text not null default 'draft'
                    check (status in ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  total           numeric(14,2) not null default 0,
  currency        text not null default 'ILS',
  valid_until     date,
  sent_at         timestamptz,
  viewed_at       timestamptz,
  responded_at    timestamptz,
  content         jsonb not null default '{}'::jsonb,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_profiles_organization_id on public.profiles(organization_id);
create index if not exists idx_clients_organization_id on public.clients(organization_id);
create index if not exists idx_projects_organization_id on public.projects(organization_id);
create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_tasks_organization_id on public.tasks(organization_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_invoices_organization_id on public.invoices(organization_id);
create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_documents_organization_id on public.documents(organization_id);
create index if not exists idx_documents_project_id on public.documents(project_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(read) where not read;
create index if not exists idx_comments_project_id on public.comments(project_id);
create index if not exists idx_comments_task_id on public.comments(task_id);
create index if not exists idx_proposals_organization_id on public.proposals(organization_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create profile on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Recalculate invoice totals when items change
create or replace function public.recalculate_invoice_totals()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_subtotal numeric(14,2);
  v_tax_rate numeric(5,2);
  v_tax_amount numeric(14,2);
  v_total numeric(14,2);
  v_invoice_id uuid;
begin
  -- Determine which invoice to recalculate
  if (tg_op = 'DELETE') then
    v_invoice_id := old.invoice_id;
  else
    v_invoice_id := new.invoice_id;
    -- Update item total
    new.total := new.quantity * new.unit_price;
  end if;

  -- Sum all items for this invoice
  select coalesce(sum(quantity * unit_price), 0)
  into v_subtotal
  from public.invoice_items
  where invoice_id = v_invoice_id;

  -- Get tax rate
  select tax_rate into v_tax_rate
  from public.invoices
  where id = v_invoice_id;

  v_tax_amount := round(v_subtotal * v_tax_rate / 100, 2);
  v_total      := v_subtotal + v_tax_amount;

  -- Update invoice
  update public.invoices
  set subtotal   = v_subtotal,
      tax_amount = v_tax_amount,
      total      = v_total,
      updated_at = now()
  where id = v_invoice_id;

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at triggers
create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.handle_updated_at();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.handle_updated_at();

create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.handle_updated_at();

create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.handle_updated_at();

create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.handle_updated_at();

create trigger trg_proposals_updated_at
  before update on public.proposals
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recalculate invoice totals
create trigger trg_invoice_items_totals
  before insert or update on public.invoice_items
  for each row execute function public.recalculate_invoice_totals();

create trigger trg_invoice_items_totals_delete
  after delete on public.invoice_items
  for each row execute function public.recalculate_invoice_totals();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations    enable row level security;
alter table public.profiles         enable row level security;
alter table public.clients          enable row level security;
alter table public.projects         enable row level security;
alter table public.tasks            enable row level security;
alter table public.invoices         enable row level security;
alter table public.invoice_items    enable row level security;
alter table public.documents        enable row level security;
alter table public.notifications    enable row level security;
alter table public.comments         enable row level security;
alter table public.proposals        enable row level security;

-- Helper: check if current user belongs to an organization
create or replace function public.user_organization_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

-- Organizations: members can read, owner can write
create policy "org_read" on public.organizations
  for select using (
    id = public.user_organization_id() or owner_id = auth.uid()
  );

create policy "org_insert" on public.organizations
  for insert with check (owner_id = auth.uid());

create policy "org_update" on public.organizations
  for update using (owner_id = auth.uid());

create policy "org_delete" on public.organizations
  for delete using (owner_id = auth.uid());

-- Profiles: users can read profiles in same org, update own
create policy "profile_read_own_org" on public.profiles
  for select using (
    id = auth.uid()
    or organization_id = public.user_organization_id()
  );

create policy "profile_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "profile_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- Macro: org-scoped table policies
-- Clients
create policy "clients_read" on public.clients
  for select using (organization_id = public.user_organization_id());

create policy "clients_insert" on public.clients
  for insert with check (organization_id = public.user_organization_id());

create policy "clients_update" on public.clients
  for update using (organization_id = public.user_organization_id());

create policy "clients_delete" on public.clients
  for delete using (organization_id = public.user_organization_id());

-- Projects
create policy "projects_read" on public.projects
  for select using (organization_id = public.user_organization_id());

create policy "projects_insert" on public.projects
  for insert with check (organization_id = public.user_organization_id());

create policy "projects_update" on public.projects
  for update using (organization_id = public.user_organization_id());

create policy "projects_delete" on public.projects
  for delete using (organization_id = public.user_organization_id());

-- Tasks
create policy "tasks_read" on public.tasks
  for select using (organization_id = public.user_organization_id());

create policy "tasks_insert" on public.tasks
  for insert with check (organization_id = public.user_organization_id());

create policy "tasks_update" on public.tasks
  for update using (organization_id = public.user_organization_id());

create policy "tasks_delete" on public.tasks
  for delete using (organization_id = public.user_organization_id());

-- Invoices
create policy "invoices_read" on public.invoices
  for select using (organization_id = public.user_organization_id());

create policy "invoices_insert" on public.invoices
  for insert with check (organization_id = public.user_organization_id());

create policy "invoices_update" on public.invoices
  for update using (organization_id = public.user_organization_id());

create policy "invoices_delete" on public.invoices
  for delete using (organization_id = public.user_organization_id());

-- Invoice items (via invoice org membership)
create policy "invoice_items_read" on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
      and i.organization_id = public.user_organization_id()
    )
  );

create policy "invoice_items_insert" on public.invoice_items
  for insert with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
      and i.organization_id = public.user_organization_id()
    )
  );

create policy "invoice_items_update" on public.invoice_items
  for update using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
      and i.organization_id = public.user_organization_id()
    )
  );

create policy "invoice_items_delete" on public.invoice_items
  for delete using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
      and i.organization_id = public.user_organization_id()
    )
  );

-- Documents
create policy "documents_read" on public.documents
  for select using (organization_id = public.user_organization_id());

create policy "documents_insert" on public.documents
  for insert with check (organization_id = public.user_organization_id());

create policy "documents_update" on public.documents
  for update using (organization_id = public.user_organization_id());

create policy "documents_delete" on public.documents
  for delete using (organization_id = public.user_organization_id());

-- Notifications: user reads/updates own
create policy "notifications_read" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());

create policy "notifications_insert" on public.notifications
  for insert with check (organization_id = public.user_organization_id());

-- Comments
create policy "comments_read" on public.comments
  for select using (organization_id = public.user_organization_id());

create policy "comments_insert" on public.comments
  for insert with check (
    organization_id = public.user_organization_id()
    and author_id = auth.uid()
  );

create policy "comments_update" on public.comments
  for update using (author_id = auth.uid());

create policy "comments_delete" on public.comments
  for delete using (author_id = auth.uid());

-- Proposals
create policy "proposals_read" on public.proposals
  for select using (organization_id = public.user_organization_id());

create policy "proposals_insert" on public.proposals
  for insert with check (organization_id = public.user_organization_id());

create policy "proposals_update" on public.proposals
  for update using (organization_id = public.user_organization_id());

create policy "proposals_delete" on public.proposals
  for delete using (organization_id = public.user_organization_id());
