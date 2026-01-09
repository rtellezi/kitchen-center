CREATE OR REPLACE FUNCTION chest.get_global_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  avg_intensity numeric;
  total_events integer;
  day_count integer;
  night_count integer;
  unique_users integer;
  avg_events_per_user numeric;
begin
  select avg(intensity), count(*), 
         count(*) filter (where time_of_day = 'day'),
         count(*) filter (where time_of_day = 'night'),
         count(distinct user_id)
  into avg_intensity, total_events, day_count, night_count, unique_users
  from chest.events;

  avg_events_per_user := case when unique_users > 0 then total_events::numeric / unique_users else 0 end;
  
  return json_build_object(
    'avgIntensity', coalesce(avg_intensity, 0),
    'totalEvents', total_events,
    'dayCount', day_count,
    'nightCount', night_count,
    'avgEventsPerUser', round(avg_events_per_user, 1)
  );
end;
$function$

