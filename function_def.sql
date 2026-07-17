CREATE OR REPLACE FUNCTION chest.get_global_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = chest, public
AS $function$
declare
  total_events integer;
  day_count integer;
  weekend_count integer;
  avg_intensity numeric;
  median_gap numeric;
  day_share numeric;
  weekend_share numeric;
  typical_pace text;
  time_pattern text;
  week_pattern text;
  satisfaction_tone text;
begin
  select
    count(*),
    count(*) filter (where time_of_day = 'day'),
    count(*) filter (where extract(dow from date) in (0, 6)),
    avg(intensity)
  into total_events, day_count, weekend_count, avg_intensity
  from chest.events;

  -- Only hide when there is nothing to aggregate
  if coalesce(total_events, 0) = 0 then
    return json_build_object(
      'available', false,
      'reason', 'no_events'
    );
  end if;

  select percentile_cont(0.5) within group (order by gap)
  into median_gap
  from (
    select date - lag(date) over (partition by profile_id order by date) as gap
    from chest.events
  ) gaps
  where gap is not null and gap > 0;

  typical_pace := case
    when median_gap is null then 'varied'
    when median_gap < 3 then 'several_times_a_week'
    when median_gap < 8 then 'about_weekly'
    when median_gap < 16 then 'a_few_times_a_month'
    when median_gap < 35 then 'about_monthly'
    else 'less_often'
  end;

  day_share := day_count::numeric / total_events;
  time_pattern := case
    when day_share >= 0.70 then 'mostly_day'
    when day_share <= 0.30 then 'mostly_night'
    else 'mixed'
  end;

  weekend_share := weekend_count::numeric / total_events;
  week_pattern := case
    when weekend_share >= 0.40 then 'weekend_leaning'
    when weekend_share <= 0.20 then 'weekday_leaning'
    else 'balanced'
  end;

  satisfaction_tone := case
    when coalesce(avg_intensity, 0) >= 4 then 'generally_high'
    when coalesce(avg_intensity, 0) >= 3 then 'generally_good'
    else 'mixed'
  end;

  return json_build_object(
    'available', true,
    'typicalPace', typical_pace,
    'timeOfDayPattern', time_pattern,
    'weekPattern', week_pattern,
    'satisfactionTone', satisfaction_tone
  );
end;
$function$;
