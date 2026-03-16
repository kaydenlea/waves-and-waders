create extension if not exists pgcrypto;

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null check (
    report_type in ('surf_check', 'catch_report', 'conditions_report', 'access_report')
  ),
  domain text not null check (domain in ('surf', 'fishing', 'shared')),
  occurred_at timestamptz not null,
  beach_id text null,
  region_id text null,
  public_label text null check (public_label is null or char_length(public_label) <= 120),
  notes text null check (notes is null or char_length(notes) <= 600),
  visibility_tier text not null check (
    visibility_tier in ('private', 'beach', 'spot_name', 'public_region')
  ),
  publication_state text not null default 'private' check (
    publication_state in ('private', 'public_candidate', 'public_published', 'suppressed')
  ),
  moderation_state text not null default 'active' check (
    moderation_state in ('active', 'under_review', 'flagged', 'spam', 'duplicate', 'removed')
  ),
  trust_state text not null default 'unverified' check (
    trust_state in ('unverified', 'single_report', 'community_confirmed', 'historical_pattern', 'stale')
  ),
  trust_score integer not null default 50 check (trust_score >= 0 and trust_score <= 100),
  deleted_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_surf_checks (
  report_id uuid primary key references public.community_reports(id) on delete cascade,
  surf_quality smallint not null check (surf_quality between 1 and 5),
  crowd_level smallint not null check (crowd_level between 1 and 5),
  observed_wind_mismatch boolean not null default false,
  observed_swell_mismatch boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_catch_reports (
  report_id uuid primary key references public.community_reports(id) on delete cascade,
  species text not null check (char_length(species) between 1 and 80),
  species_group text null check (species_group is null or char_length(species_group) <= 80),
  method text not null check (
    method in ('shore', 'kayak', 'boat', 'bait', 'lure', 'fly', 'spearfishing', 'other')
  ),
  kept boolean not null default false,
  released boolean not null default false,
  length_value numeric(8, 2) null check (length_value is null or length_value >= 0),
  length_unit text null check (length_unit in ('in', 'cm')),
  weight_value numeric(8, 2) null check (weight_value is null or weight_value >= 0),
  weight_unit text null check (weight_unit in ('lb', 'kg')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (kept or released)
);

create table if not exists public.community_conditions_reports (
  report_id uuid primary key references public.community_reports(id) on delete cascade,
  water_clarity text null check (
    water_clarity in ('dirty', 'stained', 'fair', 'clear', 'very_clear')
  ),
  current_strength text null check (
    current_strength in ('low', 'moderate', 'strong')
  ),
  bite_activity text null check (
    bite_activity in ('unknown', 'slow', 'fair', 'good', 'hot')
  ),
  observed_chop boolean not null default false,
  observed_debris boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_access_reports (
  report_id uuid primary key references public.community_reports(id) on delete cascade,
  access_status text not null check (
    access_status in ('open', 'restricted', 'closed', 'hazard')
  ),
  parking_status text null check (
    parking_status in ('easy', 'limited', 'full', 'closed', 'unknown')
  ),
  gate_status text null check (
    gate_status in ('open', 'closed', 'unknown')
  ),
  hazard_level text null check (
    hazard_level in ('none', 'minor', 'major')
  ),
  closure_kind text null check (
    closure_kind in ('none', 'temporary', 'seasonal', 'private_property', 'construction', 'other')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_condition_snapshots (
  report_id uuid primary key references public.community_reports(id) on delete cascade,
  source_beach_id text null,
  forecast_timestamp timestamptz null,
  forecast_window_start timestamptz null,
  forecast_window_end timestamptz null,
  daily_conditions_date date null,
  tide_ft numeric(8, 2) null,
  surf_min_ft numeric(8, 2) null,
  surf_max_ft numeric(8, 2) null,
  wave_energy_kj numeric(10, 2) null,
  water_temp_f numeric(8, 2) null,
  wind_speed_mph numeric(8, 2) null,
  wind_direction_deg numeric(8, 2) null,
  primary_swell_height_ft numeric(8, 2) null,
  primary_swell_period_s numeric(8, 2) null,
  primary_swell_direction_deg numeric(8, 2) null,
  captured_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_private_locations (
  report_id uuid primary key references public.community_reports(id) on delete cascade,
  exact_lat numeric(10, 7) null check (exact_lat is null or exact_lat between -90 and 90),
  exact_lng numeric(10, 7) null check (exact_lng is null or exact_lng between -180 and 180),
  private_label text null check (private_label is null or char_length(private_label) <= 160),
  waterbody_name text null check (waterbody_name is null or char_length(waterbody_name) <= 160),
  launch_point text null check (launch_point is null or char_length(launch_point) <= 160),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.community_reports(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'image' check (kind = 'image'),
  storage_path text not null unique,
  mime_type text not null,
  extension text not null,
  byte_size integer not null check (byte_size > 0),
  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  status text not null default 'pending' check (
    status in ('pending', 'ready', 'rejected', 'removed')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_report_flags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.community_reports(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (
    reason in ('spam', 'privacy', 'abuse', 'misinformation', 'duplicate', 'other')
  ),
  details text null check (details is null or char_length(details) <= 400),
  status text not null default 'open' check (
    status in ('open', 'reviewed', 'dismissed')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (report_id, reporter_id)
);

create table if not exists public.community_contributor_trust_profiles (
  author_id uuid primary key references auth.users(id) on delete cascade,
  active_report_count integer not null default 0,
  flagged_report_count integer not null default 0,
  duplicate_report_count integer not null default 0,
  latest_report_at timestamptz null,
  trust_score integer not null default 50 check (trust_score >= 0 and trust_score <= 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_public_aggregates (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('beach', 'region')),
  scope_id text not null,
  domain text not null check (domain in ('surf', 'fishing', 'shared')),
  report_type text not null check (
    report_type in ('surf_check', 'catch_report', 'conditions_report', 'access_report')
  ),
  species_group_key text not null default '',
  bucket_start timestamptz not null,
  bucket_end timestamptz not null,
  unique_contributors integer not null default 0 check (unique_contributors >= 0),
  eligible_report_count integer not null default 0 check (eligible_report_count >= 0),
  confidence_state text not null default 'not_enough_data' check (
    confidence_state in ('single_report', 'community_confirmed', 'historical_pattern', 'not_enough_data', 'stale')
  ),
  recency_state text not null default 'stale' check (
    recency_state in ('fresh', 'aging', 'stale')
  ),
  suppression_reason text null check (
    suppression_reason is null or suppression_reason in (
      'below_threshold',
      'delay_window',
      'moderation',
      'not_enough_data',
      'private_only'
    )
  ),
  is_public boolean not null default false,
  summary_json jsonb not null default '{}'::jsonb,
  last_report_at timestamptz null,
  published_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists community_public_aggregates_scope_idx
  on public.community_public_aggregates (
    scope_type,
    scope_id,
    domain,
    report_type,
    species_group_key,
    bucket_start,
    bucket_end
  );

create index if not exists community_reports_author_idx
  on public.community_reports (author_id, occurred_at desc);

create index if not exists community_reports_public_scope_idx
  on public.community_reports (publication_state, moderation_state, report_type, domain, beach_id, region_id, occurred_at desc)
  where deleted_at is null;

create index if not exists community_media_report_idx
  on public.community_media (report_id, status, created_at desc);

create or replace function public.community_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists community_reports_set_updated_at on public.community_reports;
create trigger community_reports_set_updated_at
before update on public.community_reports
for each row execute function public.community_set_updated_at();

drop trigger if exists community_surf_checks_set_updated_at on public.community_surf_checks;
create trigger community_surf_checks_set_updated_at
before update on public.community_surf_checks
for each row execute function public.community_set_updated_at();

drop trigger if exists community_catch_reports_set_updated_at on public.community_catch_reports;
create trigger community_catch_reports_set_updated_at
before update on public.community_catch_reports
for each row execute function public.community_set_updated_at();

drop trigger if exists community_conditions_reports_set_updated_at on public.community_conditions_reports;
create trigger community_conditions_reports_set_updated_at
before update on public.community_conditions_reports
for each row execute function public.community_set_updated_at();

drop trigger if exists community_access_reports_set_updated_at on public.community_access_reports;
create trigger community_access_reports_set_updated_at
before update on public.community_access_reports
for each row execute function public.community_set_updated_at();

drop trigger if exists community_condition_snapshots_set_updated_at on public.community_condition_snapshots;
create trigger community_condition_snapshots_set_updated_at
before update on public.community_condition_snapshots
for each row execute function public.community_set_updated_at();

drop trigger if exists community_private_locations_set_updated_at on public.community_private_locations;
create trigger community_private_locations_set_updated_at
before update on public.community_private_locations
for each row execute function public.community_set_updated_at();

drop trigger if exists community_media_set_updated_at on public.community_media;
create trigger community_media_set_updated_at
before update on public.community_media
for each row execute function public.community_set_updated_at();

drop trigger if exists community_report_flags_set_updated_at on public.community_report_flags;
create trigger community_report_flags_set_updated_at
before update on public.community_report_flags
for each row execute function public.community_set_updated_at();

drop trigger if exists community_contributor_trust_profiles_set_updated_at on public.community_contributor_trust_profiles;
create trigger community_contributor_trust_profiles_set_updated_at
before update on public.community_contributor_trust_profiles
for each row execute function public.community_set_updated_at();

drop trigger if exists community_public_aggregates_set_updated_at on public.community_public_aggregates;
create trigger community_public_aggregates_set_updated_at
before update on public.community_public_aggregates
for each row execute function public.community_set_updated_at();

alter table public.community_reports enable row level security;
alter table public.community_surf_checks enable row level security;
alter table public.community_catch_reports enable row level security;
alter table public.community_conditions_reports enable row level security;
alter table public.community_access_reports enable row level security;
alter table public.community_condition_snapshots enable row level security;
alter table public.community_private_locations enable row level security;
alter table public.community_media enable row level security;
alter table public.community_report_flags enable row level security;
alter table public.community_contributor_trust_profiles enable row level security;
alter table public.community_public_aggregates enable row level security;

drop policy if exists "community_reports_owner_select" on public.community_reports;
create policy "community_reports_owner_select"
on public.community_reports
for select
to authenticated
using (auth.uid() = author_id);

drop policy if exists "community_reports_owner_insert" on public.community_reports;
create policy "community_reports_owner_insert"
on public.community_reports
for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "community_reports_owner_update" on public.community_reports;
create policy "community_reports_owner_update"
on public.community_reports
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "community_reports_owner_delete" on public.community_reports;
create policy "community_reports_owner_delete"
on public.community_reports
for delete
to authenticated
using (auth.uid() = author_id);

drop policy if exists "community_surf_checks_owner_all" on public.community_surf_checks;
create policy "community_surf_checks_owner_all"
on public.community_surf_checks
for all
to authenticated
using (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
);

drop policy if exists "community_catch_reports_owner_all" on public.community_catch_reports;
create policy "community_catch_reports_owner_all"
on public.community_catch_reports
for all
to authenticated
using (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
);

drop policy if exists "community_conditions_reports_owner_all" on public.community_conditions_reports;
create policy "community_conditions_reports_owner_all"
on public.community_conditions_reports
for all
to authenticated
using (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
);

drop policy if exists "community_access_reports_owner_all" on public.community_access_reports;
create policy "community_access_reports_owner_all"
on public.community_access_reports
for all
to authenticated
using (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
);

drop policy if exists "community_condition_snapshots_owner_all" on public.community_condition_snapshots;
create policy "community_condition_snapshots_owner_all"
on public.community_condition_snapshots
for all
to authenticated
using (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
);

drop policy if exists "community_private_locations_owner_all" on public.community_private_locations;
create policy "community_private_locations_owner_all"
on public.community_private_locations
for all
to authenticated
using (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.community_reports reports
    where reports.id = report_id and reports.author_id = auth.uid()
  )
);

drop policy if exists "community_media_owner_select" on public.community_media;
create policy "community_media_owner_select"
on public.community_media
for select
to authenticated
using (auth.uid() = author_id);

drop policy if exists "community_media_owner_insert" on public.community_media;
create policy "community_media_owner_insert"
on public.community_media
for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "community_media_owner_update" on public.community_media;
create policy "community_media_owner_update"
on public.community_media
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "community_report_flags_owner_select" on public.community_report_flags;
create policy "community_report_flags_owner_select"
on public.community_report_flags
for select
to authenticated
using (auth.uid() = reporter_id);

drop policy if exists "community_report_flags_owner_insert" on public.community_report_flags;
create policy "community_report_flags_owner_insert"
on public.community_report_flags
for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "community_public_aggregates_public_select" on public.community_public_aggregates;
create policy "community_public_aggregates_public_select"
on public.community_public_aggregates
for select
to anon, authenticated
using (is_public = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-images',
  'community-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
