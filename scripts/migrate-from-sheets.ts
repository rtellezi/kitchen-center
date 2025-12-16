import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Papa from 'papaparse';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Uses VITE_GOOGLE_SHEET_URL if available (copy from frontend env), or GOOGLE_SHEET_URL
const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL || process.env.VITE_GOOGLE_SHEET_URL; 
const TARGET_USER_ID = process.env.TARGET_USER_ID; 

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_SHEET_URL || !TARGET_USER_ID) {
  console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_SHEET_URL, TARGET_USER_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const sanitizeDate = (str: string): Date | null => {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
};

async function migrate() {
    console.log('Fetching CSV...');
    try {
        const response = await axios.get(GOOGLE_SHEET_URL || '');
        const csvText = response.data;

        console.log('Parsing CSV...');
        const { data } = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        console.log(`Found ${data.length} rows. Transforming...`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const events = data.map((row: any) => {
            const date = sanitizeDate(row['Fecha']);
            if (!date) return null;

            let intensity = parseInt(row['Ranking'] || '1');
            if (isNaN(intensity)) intensity = 1;
            if (intensity < 1) intensity = 1;
            if (intensity > 5) intensity = 5;

            const timeOfDay = (row['Horario'] || '').includes('🌚') ? 'night' : 'day';
            
            // Handle various truthy values for checkbox
            const rawCiclo = row['Ciclo'];
            const isCycle = rawCiclo === 'TRUE' || rawCiclo === 'true' || rawCiclo === true || rawCiclo === 'verdadero'|| rawCiclo === 'new';
            
            return {
                user_id: TARGET_USER_ID,
                date: date.toISOString().split('T')[0], 
                intensity,
                time_of_day: timeOfDay,
                is_cycle: isCycle,
            };
        }).filter((e: any) => e !== null);

        console.log(`Ready to insert ${events.length} events.`);

        // Batch insert in chunks of 100 to avoid request size limits
        const chunkSize = 100;
        for (let i = 0; i < events.length; i += chunkSize) {
            const chunk = events.slice(i, i + chunkSize);
            const { error } = await supabase.schema('chest').from('events').insert(chunk);
            if (error) {
                console.error(`Error inserting chunk ${i}:`, error);
            } else {
                console.log(`Inserted chunk ${i} - ${i + chunk.length}`);
            }
        }
        
        console.log('Migration completed!');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();

