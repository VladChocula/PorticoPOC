import { supabase } from '../supabase/supabaseClient.js'

async function testConnection() {
    const { data, error } = await supabase.from('nj_roads').select('*').limit(1);

    if (error) {
        console.error('Supabase connection failed:', error.message);
    } else {
        console.log('Supabase connection successful!');
        console.log('sample data:', data);
    }
}

testConnection();