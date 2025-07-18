import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    const { data, error } = await supabase.from('properties').select('*');
    if (error) {
        console.error('Error fetching:', error.message)
    } else {
        console.log('Data:', data);
    }
}

testConnection();