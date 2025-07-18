import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {

    // Query props
    let { data: properties, error: propError } = await supabase
        .from('properties')
        .select('*');

    if (propError) {
        console.error('Error fetching properties:', propError.message);
    } else {
        console.log('Properties:', properties);
    };

    let { data: images, error: imgError } = await supabase
        .from('original_images')
        .select('*');

    if (imgError) {
        console.error('Error fetching images:', imgError.message)
    } else {
        console.log('Original Images:', images);
    }
}

testQueries();