const { Client } = require('pg');
require('dotenv').config();

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    try {
        const res = await client.query(`
            SELECT pg_get_functiondef(p.oid) as definition
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'chest' AND p.proname = 'get_global_stats';
        `);
        console.log(res.rows[0]?.definition);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
