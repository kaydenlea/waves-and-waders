alter table if exists public.user_dashboard_settings
  add column if not exists overview_table_density text,
  add column if not exists forecast_table_density text,
  add column if not exists forecast_table_view_mode text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_dashboard_settings'
      and column_name = 'overview_table_density'
  ) then
    alter table public.user_dashboard_settings
      drop constraint if exists user_dashboard_settings_overview_table_density_check;
    alter table public.user_dashboard_settings
      add constraint user_dashboard_settings_overview_table_density_check
      check (overview_table_density is null or overview_table_density in ('3h', '12h'));
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_dashboard_settings'
      and column_name = 'forecast_table_density'
  ) then
    alter table public.user_dashboard_settings
      drop constraint if exists user_dashboard_settings_forecast_table_density_check;
    alter table public.user_dashboard_settings
      add constraint user_dashboard_settings_forecast_table_density_check
      check (forecast_table_density is null or forecast_table_density in ('3h', '12h'));
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_dashboard_settings'
      and column_name = 'forecast_table_view_mode'
  ) then
    alter table public.user_dashboard_settings
      drop constraint if exists user_dashboard_settings_forecast_table_view_mode_check;
    alter table public.user_dashboard_settings
      add constraint user_dashboard_settings_forecast_table_view_mode_check
      check (forecast_table_view_mode is null or forecast_table_view_mode in ('all', 'single'));
  end if;
end $$;
