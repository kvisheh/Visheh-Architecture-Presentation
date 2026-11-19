-- Run in a new Supabase project. All amounts are integral rials, stored as numeric(16,0).
create table public.projects (
 id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 120),
 location text not null default '', budget numeric(16,0) not null default 0 check (budget between 0 and 9007199254740991),
 created_at timestamptz not null default now()
);
create table public.app_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('team','client'))
);
create table public.project_access (
 project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key (project_id,user_id)
);
create table public.payments (
 id uuid primary key, project_id uuid not null references public.projects(id) on delete cascade,
 reason text not null check (length(reason) between 1 and 100), payment_date date not null,
 amount numeric(16,0) not null check (amount between 1 and 9007199254740991),
 method text not null check (length(method) between 1 and 70), payee text not null default '', note text not null default '',
 client_visible boolean not null default false, receipt_path text,
 budget_snapshot numeric(16,0) not null, spent_snapshot numeric(16,0) not null, balance_snapshot numeric(17,0) not null,
 voided boolean not null default false, void_reason text, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 check (receipt_path is null or receipt_path like project_id::text || '/%')
);
create index payments_project_idx on public.payments(project_id,created_at desc);
create table public.suggestions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 kind text not null check (kind in ('reason','method')), label text not null check (length(label) between 1 and 70),
 icon text not null default 'other', created_at timestamptz not null default now(), unique(project_id,kind,label)
);
create table public.work_logs (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 name text not null, quantity numeric(13,3) not null check(quantity>0), unit text not null,
 rate numeric(16,0) not null check(rate>=0), log_date date not null, created_at timestamptz not null default now()
);
create table public.stock_movements (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 item text not null, quantity numeric(13,3) not null check(quantity>0), unit text not null,
 direction text not null check(direction in ('in','out')), movement_date date not null,
 client_visible boolean not null default false, created_at timestamptz not null default now()
);
create table public.progress_logs (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 title text not null, percent int not null check(percent between 0 and 100),
 status text not null, description text not null default '', report_date date not null,
 client_visible boolean not null default false, created_at timestamptz not null default now()
);
create table public.login_throttle (
 key text primary key, window_start timestamptz not null default now(), attempts int not null default 0
);
alter table public.login_throttle enable row level security;
revoke all on public.login_throttle from public,anon,authenticated;

create or replace function public.can_access(p_project uuid, p_role text default null)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.project_access a join public.app_roles r on r.user_id=a.user_id
 where a.user_id=auth.uid() and a.project_id=p_project and (p_role is null or r.role=p_role))
$$;
revoke all on function public.can_access(uuid,text) from public,anon;
grant execute on function public.can_access(uuid,text) to authenticated;

alter table public.projects enable row level security;
alter table public.app_roles enable row level security;
alter table public.project_access enable row level security;
alter table public.payments enable row level security;
alter table public.suggestions enable row level security;
alter table public.work_logs enable row level security;
alter table public.stock_movements enable row level security;
alter table public.progress_logs enable row level security;
-- Never expose the role or access tables through the REST API.
revoke all on public.app_roles,public.project_access from anon,authenticated;
grant select on public.projects,public.payments,public.suggestions,public.work_logs,public.stock_movements,public.progress_logs to authenticated;
grant insert,update,delete on public.suggestions,public.work_logs,public.stock_movements,public.progress_logs to authenticated;
create policy team_projects on public.projects for select to authenticated using(public.can_access(id,'team'));
create policy team_payments on public.payments for select to authenticated using(public.can_access(project_id,'team'));
create policy team_suggestions on public.suggestions for all to authenticated using(public.can_access(project_id,'team')) with check(public.can_access(project_id,'team'));
create policy team_work on public.work_logs for all to authenticated using(public.can_access(project_id,'team')) with check(public.can_access(project_id,'team'));
create policy team_stock on public.stock_movements for all to authenticated using(public.can_access(project_id,'team')) with check(public.can_access(project_id,'team'));
create policy team_progress on public.progress_logs for all to authenticated using(public.can_access(project_id,'team')) with check(public.can_access(project_id,'team'));

create or replace function public.get_workspace() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_role text; v_team boolean; result jsonb;
begin
 select role into v_role from public.app_roles where user_id=auth.uid();
 if v_role is null then raise exception 'Access denied'; end if;
 v_team := v_role='team';
 select jsonb_build_object(
 'role',v_role,
 'projects',coalesce((select jsonb_agg(case when v_team then to_jsonb(p) else to_jsonb(p)-'budget' end order by p.created_at)
 from public.projects p where public.can_access(p.id)), '[]'::jsonb),
 'payments',coalesce((select jsonb_agg(case when v_team then to_jsonb(t) else to_jsonb(t)-'budget_snapshot'-'spent_snapshot'-'balance_snapshot' end order by t.created_at desc)
 from public.payments t where public.can_access(t.project_id) and (v_team or (t.client_visible and not t.voided))), '[]'::jsonb),
 'suggestions',case when v_team then coalesce((select jsonb_agg(to_jsonb(s)) from public.suggestions s where public.can_access(s.project_id)),'[]'::jsonb) else '[]'::jsonb end,
 'work_logs',case when v_team then coalesce((select jsonb_agg(to_jsonb(w)) from public.work_logs w where public.can_access(w.project_id)),'[]'::jsonb) else '[]'::jsonb end,
 'stock_movements',coalesce((select jsonb_agg(to_jsonb(g)) from public.stock_movements g where public.can_access(g.project_id) and (v_team or g.client_visible)),'[]'::jsonb),
 'progress_logs',coalesce((select jsonb_agg(to_jsonb(g)) from public.progress_logs g where public.can_access(g.project_id) and (v_team or g.client_visible)),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.get_workspace() from public,anon;
grant execute on function public.get_workspace() to authenticated;

create or replace function public.set_budget(p_project_id uuid,p_budget numeric)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.can_access(p_project_id,'team') then raise exception 'Access denied'; end if;
 if p_budget<1 or p_budget>9007199254740991 or p_budget<>trunc(p_budget) then raise exception 'Invalid budget'; end if;
 update public.projects set budget=p_budget where id=p_project_id;
end $$;
revoke all on function public.set_budget(uuid,numeric) from public,anon;
grant execute on function public.set_budget(uuid,numeric) to authenticated;

create or replace function public.finalize_payment(
 p_id uuid,p_project_id uuid,p_reason text,p_date date,p_amount numeric,
 p_method text,p_payee text default '',p_note text default '',p_client_visible boolean default false,p_receipt_path text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_budget numeric; v_spent numeric; v_row public.payments%rowtype;
begin
 if not public.can_access(p_project_id,'team') then raise exception 'Access denied'; end if;
 select budget into v_budget from public.projects where id=p_project_id for update;
 if not found then raise exception 'Project missing'; end if;
 select * into v_row from public.payments where id=p_id;
 if found then
   if v_row.project_id<>p_project_id or v_row.amount<>p_amount or v_row.reason<>p_reason then raise exception 'Conflicting payment id'; end if;
   return to_jsonb(v_row);
 end if;
 if p_amount<=0 or p_amount>9007199254740991 or p_amount<>trunc(p_amount) then raise exception 'Invalid amount'; end if;
 if length(trim(p_reason)) not between 1 and 100 or length(trim(p_method)) not between 1 and 70 then raise exception 'Missing fields'; end if;
 if p_receipt_path is not null and p_receipt_path not like p_project_id::text || '/%' then raise exception 'Invalid receipt path'; end if;
 select coalesce(sum(amount),0) into v_spent from public.payments where project_id=p_project_id and not voided;
 insert into public.payments(id,project_id,reason,payment_date,amount,method,payee,note,client_visible,receipt_path,budget_snapshot,spent_snapshot,balance_snapshot,created_by)
 values(p_id,p_project_id,trim(p_reason),p_date,p_amount,trim(p_method),coalesce(p_payee,''),coalesce(p_note,''),coalesce(p_client_visible,false),p_receipt_path,v_budget,v_spent+p_amount,v_budget-v_spent-p_amount,auth.uid()) returning * into v_row;
 return to_jsonb(v_row);
end $$;
revoke all on function public.finalize_payment(uuid,uuid,text,date,numeric,text,text,text,boolean,text) from public,anon;
grant execute on function public.finalize_payment(uuid,uuid,text,date,numeric,text,text,text,boolean,text) to authenticated;

-- Private bucket. Upload by team to own project. Read only team or a published, nonvoided payment.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('site-receipts','site-receipts',false,20971520,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;
create policy receipt_upload on storage.objects for insert to authenticated
 with check (bucket_id='site-receipts' and public.can_access((split_part(name,'/',1))::uuid,'team'));
create policy receipt_read on storage.objects for select to authenticated using (
 bucket_id='site-receipts' and (
 public.can_access((split_part(name,'/',1))::uuid,'team')
 or exists(select 1 from public.payments p where p.receipt_path=name and p.client_visible and not p.voided and public.can_access(p.project_id,'client'))
 ));

-- Service-role-only throttle for the login edge function. Keys are SHA-256 hashes of IP and a server-only salt.
create or replace function public.register_login_attempt(p_key text,p_limit int default 8)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_attempts int;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then raise exception 'Access denied'; end if;
 insert into public.login_throttle(key,window_start,attempts) values(p_key,now(),1)
 on conflict(key) do update set attempts=case when login_throttle.window_start<now()-interval '15 minutes' then 1 else login_throttle.attempts+1 end,
 window_start=case when login_throttle.window_start<now()-interval '15 minutes' then now() else login_throttle.window_start end
 returning attempts into v_attempts;
 return v_attempts<=p_limit;
end $$;
revoke all on function public.register_login_attempt(text,int) from public,anon,authenticated;
grant execute on function public.register_login_attempt(text,int) to service_role;
