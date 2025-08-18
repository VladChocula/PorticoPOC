import { supabase } from '../supabaseClient.js';

async function initSchema() {
    try{
        let { error: roadsError } = await supabase.rpc('exec_sql', {
        sql: `
        create table if not exists nj_roads (
            state text not null,
            county text not null,
            town text not null,
            road_name text not null,
            created_at timestamptz default now()
        );
        `
        })
        if (roadsError) throw roadsError;

        let { error: propsError } = await supabase.rpc('exec_sql', {
            sql: `
            create table if not exists nj_properties (
                id uuid primary key default gen_random_uuid(),
                full_address text not null,
                town text not null,
                county text not null,
                zip_code text not null,
                street_name text not null,
                market_value numeric,
                year_built int,
                last_sale text,
                created_at timestamptz default now()
            );
            `
        });
        if (propsError) throw propsError;
    } catch (err) {
    console.log('Error initializing schema:', err.message);
    }

    console.log(" Schema initialized successfully!");
} 

initSchema();