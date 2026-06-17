-- ============================================================
-- Deliverables Management System for Architect Tools
-- ============================================================

-- Architecture tools enumeration
create type architecture_tool as enum (
  'revit',
  'autocad',
  'archicad',
  'sketchup',
  'rhino',
  'vectorworks',
  'chief_architect',
  'lumion',
  'enscape',
  'vray',
  'corona',
  'twinmotion',
  'unreal_engine',
  'd5_render',
  '3ds_max',
  'photoshop',
  'illustrator',
  'indesign',
  'blender',
  'autodesk_forma',
  'navisworks',
  'excel',
  'project',
  'other'
);

-- Deliverable types (phases/categories)
create type deliverable_category as enum (
  'concept',
  'schematic',
  'design_dev',
  'construction_docs',
  'rendering',
  'animation',
  'specifications',
  'bom',
  'schedules',
  'reports',
  'site_photos',
  'other'
);

-- Deliverables table - what needs to be delivered from the project
create table if not exists public.deliverables (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  name                text not null,
  description         text,
  category            deliverable_category not null default 'other',
  required_tools      architecture_tool[] default '{}'::architecture_tool[],
  due_date            timestamptz,
  assigned_to         uuid references auth.users(id) on delete set null,
  status              text not null default 'pending' check (status in ('pending', 'in_progress', 'review', 'approved', 'archived')),
  approval_status     text default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  sort_order          integer not null default 0,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Deliverable files - actual file uploads with versions
create table if not exists public.deliverable_files (
  id                  uuid primary key default uuid_generate_v4(),
  deliverable_id      uuid not null references public.deliverables(id) on delete cascade,
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  file_name           text not null,
  file_path           text not null unique,
  file_size           bigint,
  file_type           text,
  tool_used           architecture_tool not null default 'other',
  version_number      integer not null default 1,
  description         text,
  uploaded_by         uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Deliverable comments/reviews
create table if not exists public.deliverable_comments (
  id                  uuid primary key default uuid_generate_v4(),
  deliverable_id      uuid not null references public.deliverables(id) on delete cascade,
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  author_id           uuid not null references auth.users(id) on delete cascade,
  content             text not null,
  status              text check (status in ('comment', 'review', 'revision_request')),
  edited_at           timestamptz,
  created_at          timestamptz not null default now()
);

-- RLS Policies
alter table public.deliverables enable row level security;
alter table public.deliverable_files enable row level security;
alter table public.deliverable_comments enable row level security;

-- Deliverables policies
create policy "organizations can view their deliverables" on public.deliverables
  for select using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy "organizations can insert deliverables" on public.deliverables
  for insert with check (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy "organizations can update deliverables" on public.deliverables
  for update using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

-- Files policies
create policy "organizations can view files" on public.deliverable_files
  for select using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy "organizations can upload files" on public.deliverable_files
  for insert with check (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

-- Comments policies
create policy "organizations can view comments" on public.deliverable_comments
  for select using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

create policy "users can add comments" on public.deliverable_comments
  for insert with check (
    author_id = auth.uid() and
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

-- Indexes for performance
create index idx_deliverables_project on public.deliverables(project_id);
create index idx_deliverables_assigned_to on public.deliverables(assigned_to);
create index idx_deliverables_status on public.deliverables(status);
create index idx_deliverable_files_deliverable on public.deliverable_files(deliverable_id);
create index idx_deliverable_files_tool on public.deliverable_files(tool_used);
create index idx_deliverable_comments_deliverable on public.deliverable_comments(deliverable_id);
