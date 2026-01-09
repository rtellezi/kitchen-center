const { Client } = require('pg');
require('dotenv').config();

const SQL = `
ALTER TABLE chest.profiles 
ADD COLUMN IF NOT EXISTS default_partner_id uuid REFERENCES chest.partners(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS include_no_partner_events boolean DEFAULT true;
`;

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query(SQL);
        console.log('✅ Profiles table updated successfully');
    } catch (e) {
        console.error('❌ Error updating table:', e);
    } finally {
        await client.end();
    }
}

main();
