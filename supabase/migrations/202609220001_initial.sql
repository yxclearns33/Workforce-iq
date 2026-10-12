create extension if not exists pgcrypto;

create type public.member_role as enum ('delivery_manager','project_manager','risk_owner','team_member','administrator','contractor','client','executive_viewer');
create type public.workflow_status as enum ('Todo','In Progress','Review','Done','Blocked');
create type public.risk_status as enum ('draft','open','monitoring','accepted','closed');
create type public.decision_status as enum ('draft','collecting','review','approved','rejected','archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  job_title text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  timezone text not null default 'Europe/London',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null,
  status text not null default 'active' check (status in ('invited','active','suspended')),
  joined_at timestamptz default now(),
  primary key (organisation_id,profile_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null, description text, source_system text, source_reference text, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'team_member', workload numeric(5,2) not null default 0,
  primary key(project_id,profile_id)
);
create table public.sprints (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  name text not null, starts_on date, ends_on date, status text not null default 'planned', created_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  sprint_id uuid references public.sprints(id) on delete set null, assignee_id uuid references public.profiles(id) on delete set null,
  title text not null, description text, task_type text, complexity text, priority text, effort numeric(8,2) default 0,
  status public.workflow_status not null default 'Todo', source_reference text, carried_from_sprint_id uuid references public.sprints(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.task_outcomes (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  assignee_id uuid references public.profiles(id) on delete set null, completed_at timestamptz not null default now(),
  planned_effort numeric, actual_effort numeric, on_time boolean, quality_score numeric check(quality_score between 1 and 5),
  rework_count integer not null default 0, blocked_days numeric not null default 0, manager_note text, snapshot jsonb not null default '{}'::jsonb
);

create table public.checkin_requests (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade, task_id uuid references public.tasks(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade, secure_token_hash text, expires_at timestamptz,
  status text not null default 'pending', sent_at timestamptz, created_at timestamptz not null default now()
);
create table public.checkin_responses (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.checkin_requests(id) on delete cascade,
  respondent_id uuid references public.profiles(id) on delete set null, delivery_state text not null,
  explanation text, version integer not null default 1, submitted_at timestamptz not null default now()
);

create table public.risks (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade, source_task_id uuid references public.tasks(id) on delete set null,
  title text not null, cause text, event text, impact_statement text, category text, owner_id uuid references public.profiles(id),
  likelihood smallint check(likelihood between 1 and 5), impact smallint check(impact between 1 and 5),
  inherent_score integer generated always as (coalesce(likelihood,0)*coalesce(impact,0)) stored,
  control_effectiveness numeric(5,2) default 0 check(control_effectiveness between 0 and 100),
  treatment text, contingency text, kri text, kri_threshold text, review_on date, status public.risk_status not null default 'draft',
  approved_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.risk_controls (
  id uuid primary key default gen_random_uuid(), risk_id uuid not null references public.risks(id) on delete cascade,
  name text not null, owner_id uuid references public.profiles(id), effectiveness numeric(5,2) default 0,
  evidence_url text, tested_at timestamptz, next_test_on date, status text not null default 'planned'
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade, risk_id uuid references public.risks(id) on delete set null,
  title text not null, problem_statement text, method text not null default 'weighted_matrix', owner_id uuid references public.profiles(id),
  response_target integer default 1, quorum_percent numeric default 70, status public.decision_status not null default 'draft',
  approved_alternative_id uuid, approved_by uuid references public.profiles(id), approved_at timestamptz, approval_reason text,
  calculation_version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.decision_criteria (
  id uuid primary key default gen_random_uuid(), decision_id uuid not null references public.decisions(id) on delete cascade,
  name text not null, description text, weight numeric not null default 0, direction text not null default 'higher',
  minimum_score numeric, is_disqualifying boolean not null default false, sort_order integer not null default 0
);
create table public.decision_alternatives (
  id uuid primary key default gen_random_uuid(), decision_id uuid not null references public.decisions(id) on delete cascade,
  name text not null, description text, sort_order integer not null default 0
);
alter table public.decisions add constraint decisions_approved_alternative_fk foreign key (approved_alternative_id) references public.decision_alternatives(id);
create table public.score_requests (
  id uuid primary key default gen_random_uuid(), decision_id uuid not null references public.decisions(id) on delete cascade,
  recipient_id uuid references public.profiles(id), recipient_email text, secure_token_hash text, expires_at timestamptz,
  status text not null default 'pending', sent_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now()
);
create table public.scores (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.score_requests(id) on delete cascade,
  criterion_id uuid not null references public.decision_criteria(id) on delete cascade,
  alternative_id uuid not null references public.decision_alternatives(id) on delete cascade,
  respondent_id uuid references public.profiles(id), score numeric not null check(score between 0 and 10),
  confidence text check(confidence in ('low','medium','high')), comment text, evidence_url text, created_at timestamptz not null default now(),
  unique(request_id,criterion_id,alternative_id,respondent_id)
);
create table public.audit_log (
  id bigint generated always as identity primary key, organisation_id uuid not null references public.organisations(id) on delete cascade,
  actor_id uuid references public.profiles(id), entity_type text not null, entity_id uuid, action text not null,
  before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);

create or replace function public.is_org_member(org_id uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organisation_members m where m.organisation_id=org_id and m.profile_id=auth.uid() and m.status='active');
$$;
create or replace function public.has_org_role(org_id uuid, allowed public.member_role[]) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organisation_members m where m.organisation_id=org_id and m.profile_id=auth.uid() and m.status='active' and m.role=any(allowed));
$$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin
  insert into public.profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create or replace function public.create_organisation(org_name text, org_industry text default null, org_timezone text default 'Europe/London') returns uuid
language plpgsql security definer set search_path=public as $$ declare new_id uuid; begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.organisations(name,industry,timezone,created_by) values(org_name,org_industry,org_timezone,auth.uid()) returning id into new_id;
  insert into public.organisation_members(organisation_id,profile_id,role,status) values(new_id,auth.uid(),'administrator','active');
  return new_id;
end; $$;

alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.sprints enable row level security;
alter table public.tasks enable row level security;
alter table public.task_outcomes enable row level security;
alter table public.checkin_requests enable row level security;
alter table public.checkin_responses enable row level security;
alter table public.risks enable row level security;
alter table public.risk_controls enable row level security;
alter table public.decisions enable row level security;
alter table public.decision_criteria enable row level security;
alter table public.decision_alternatives enable row level security;
alter table public.score_requests enable row level security;
alter table public.scores enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles self" on public.profiles for all using(id=auth.uid()) with check(id=auth.uid());
create policy "profiles visible to colleagues" on public.profiles for select using(exists(select 1 from public.organisation_members mine join public.organisation_members theirs on theirs.organisation_id=mine.organisation_id where mine.profile_id=auth.uid() and theirs.profile_id=profiles.id and mine.status='active'));
create policy "org members read org" on public.organisations for select using(public.is_org_member(id));
create policy "admins update org" on public.organisations for update using(public.has_org_role(id,array['administrator','delivery_manager']::public.member_role[]));
create policy "members read memberships" on public.organisation_members for select using(public.is_org_member(organisation_id));
create policy "admins manage memberships" on public.organisation_members for all using(public.has_org_role(organisation_id,array['administrator','delivery_manager']::public.member_role[]));
create policy "members read projects" on public.projects for select using(public.is_org_member(organisation_id));
create policy "managers manage projects" on public.projects for all using(public.has_org_role(organisation_id,array['administrator','delivery_manager','project_manager']::public.member_role[]));
create policy "project members read" on public.project_members for select using(exists(select 1 from public.projects p where p.id=project_id and public.is_org_member(p.organisation_id)));
create policy "project managers manage members" on public.project_members for all using(exists(select 1 from public.projects p where p.id=project_id and public.has_org_role(p.organisation_id,array['administrator','delivery_manager','project_manager']::public.member_role[])));
create policy "sprints org access" on public.sprints for all using(exists(select 1 from public.projects p where p.id=project_id and public.is_org_member(p.organisation_id)));
create policy "tasks project access" on public.tasks for select using(exists(select 1 from public.projects p where p.id=project_id and public.is_org_member(p.organisation_id)));
create policy "task updates" on public.tasks for update using(assignee_id=auth.uid() or exists(select 1 from public.projects p where p.id=project_id and public.has_org_role(p.organisation_id,array['administrator','delivery_manager','project_manager']::public.member_role[])));
create policy "task managers insert" on public.tasks for insert with check(exists(select 1 from public.projects p where p.id=project_id and public.has_org_role(p.organisation_id,array['administrator','delivery_manager','project_manager']::public.member_role[])));
create policy "outcomes project access" on public.task_outcomes for select using(exists(select 1 from public.tasks t join public.projects p on p.id=t.project_id where t.id=task_id and public.is_org_member(p.organisation_id)));
create policy "checkin recipient access" on public.checkin_requests for select using(recipient_id=auth.uid() or public.is_org_member(organisation_id));
create policy "checkin response access" on public.checkin_responses for all using(respondent_id=auth.uid() or exists(select 1 from public.checkin_requests q where q.id=request_id and public.is_org_member(q.organisation_id)));
create policy "risk org read" on public.risks for select using(public.is_org_member(organisation_id));
create policy "risk managers write" on public.risks for all using(public.has_org_role(organisation_id,array['administrator','delivery_manager','project_manager','risk_owner']::public.member_role[]));
create policy "controls org access" on public.risk_controls for all using(exists(select 1 from public.risks r where r.id=risk_id and public.is_org_member(r.organisation_id)));
create policy "decision org read" on public.decisions for select using(public.is_org_member(organisation_id));
create policy "decision managers write" on public.decisions for all using(public.has_org_role(organisation_id,array['administrator','delivery_manager','project_manager','risk_owner']::public.member_role[]));
create policy "criteria decision access" on public.decision_criteria for all using(exists(select 1 from public.decisions d where d.id=decision_id and public.is_org_member(d.organisation_id)));
create policy "alternatives decision access" on public.decision_alternatives for all using(exists(select 1 from public.decisions d where d.id=decision_id and public.is_org_member(d.organisation_id)));
create policy "score request participant" on public.score_requests for select using(recipient_id=auth.uid() or exists(select 1 from public.decisions d where d.id=decision_id and public.is_org_member(d.organisation_id)));
create policy "scores participant" on public.scores for all using(respondent_id=auth.uid() or exists(select 1 from public.score_requests q join public.decisions d on d.id=q.decision_id where q.id=request_id and public.is_org_member(d.organisation_id)));
create policy "audit managers read" on public.audit_log for select using(public.has_org_role(organisation_id,array['administrator','delivery_manager','project_manager','risk_owner']::public.member_role[]));

alter publication supabase_realtime add table public.tasks,public.risks,public.decisions,public.score_requests;
