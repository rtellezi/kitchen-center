const { Client } = require('pg');
require('dotenv').config();

const SQL = `
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
  unique_profiles integer;
  avg_events_per_profile numeric;
begin
  select avg(intensity), count(*), 
         count(*) filter (where time_of_day = 'day'),
         count(*) filter (where time_of_day = 'night'),
         count(distinct profile_id)
  into avg_intensity, total_events, day_count, night_count, unique_profiles
  from chest.events;

  avg_events_per_profile := case when unique_profiles > 0 then total_events::numeric / unique_profiles else 0 end;
  
  return json_build_object(
    'avgIntensity', coalesce(avg_intensity, 0),
    'totalEvents', total_events,
    'dayCount', day_count,
    'nightCount', night_count,
    'avgEventsPerUser', round(avg_events_per_profile, 1)
  );
end;
$function$;
`;

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    try {
        await client.query(SQL);
        console.log('✅ get_global_stats updated successfully');
    } catch (e) {
        console.error('❌ Error updating function:', e);
    } finally {
        await client.end();
    }
}

main();
