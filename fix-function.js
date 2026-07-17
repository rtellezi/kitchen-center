const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SQL = fs.readFileSync(path.join(__dirname, 'function_def.sql'), 'utf8');

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
