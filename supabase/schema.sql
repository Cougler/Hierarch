-- Flowki Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Projects Table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- 2. Tasks Table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'Backlog',
  due_at timestamptz,
  position int,
  created_at timestamptz not null default now()
);

-- 3. Resources Table
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  project_id uuid references projects(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  type text not null,
  title text,
  content text,
  created_at timestamptz not null default now()
);

-- 4. Enable Row Level Security
alter table projects enable row level security;
alter table tasks enable row level security;
alter table resources enable row level security;

-- 5. RLS Policies
create policy "Users can manage their own projects" on projects for all using (owner_id = auth.uid());
create policy "Users can manage their own tasks" on tasks for all using (owner_id = auth.uid());
create policy "Users can manage their own resources" on resources for all using (owner_id = auth.uid());
