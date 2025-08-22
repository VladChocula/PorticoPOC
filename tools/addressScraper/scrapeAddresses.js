import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { supabase } from '../../supabase/supabaseClient.js';
import { fileURLToPath } from 'url';
import path from 'path';

puppeteer.use(StealthPlugin());

async function scrapeAddresses(delayBetweenPages = 3000) { // default 3s delay
    try {
        // Pull all roads from nj_roads
        const { data: roads, error: roadsError } = await supabase
            .from('nj_roads')
            .select('*');

        if (roadsError) throw roadsError;
        if (!roads.length) {
            console.log('No roads found in nj_roads table.');
            return;
        }

        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        );

        for (const road of roads) {
            const { state, county, town, road_name } = road;
            const url = formatRoadURL(state, town, road_name);
            console.log(`Opening page: ${url}`);

            try {
                await gotoWithRetry(page, url);

                const addresses = await page.evaluate(() => {
                    const rows = document.querySelectorAll('#property-records-by table tbody tr');
                    return Array.from(rows).map(row => {
                        const tds = row.querySelectorAll('td');
                        if (!tds.length) return null;

                        const fullAddress = tds[0]?.textContent?.trim() || null;
                        const marketValue = tds[1]?.textContent?.trim() || null;
                        const yearBuilt = tds[2]?.textContent?.trim() || null;
                        const lastSale = tds[3]?.textContent?.trim() || null;

                        const zipMatch = fullAddress?.match(/(\d{5})$/);
                        const zipCode = zipMatch ? zipMatch[1] : null;

                        const streetName = fullAddress ? fullAddress.split(',')[0] : null;

                        return {
                            full_address: fullAddress,
                            street_name: streetName,
                            market_value: marketValue,
                            year_built: yearBuilt,
                            last_sale: lastSale,
                        };
                    }).filter(Boolean);
                });

                console.log(`Found ${addresses.length} addresses for ${road_name}, ${town}`);

                if (addresses.length) {
                    await saveAddressesBatch(addresses.map(addr => ({
                        ...addr,
                        town,
                        county,
                        state,
                        street_name: road_name
                    })));
                }

                // Delay before moving to the next road
                console.log(`Waiting ${delayBetweenPages}ms before next page...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenPages));

            } catch (pageErr) {
                console.error(`Error scraping ${road_name}, ${town}:`, pageErr.message);
            }
        }

        await browser.close();

    } catch (err) {
        console.error('Error fetching roads:', err.message);
    }
}

function formatRoadURL(state, town, road_name) {
    // Normalize road name
    let formattedRoad = road_name.toLowerCase().trim();

    // Replace common street types with abbreviations
    formattedRoad = formattedRoad
        .replace(/\bcourt\b/g, 'ct')
        .replace(/\bstreet\b/g, 'st')
        .replace(/\broad\b/g, 'rd')
        .replace(/\bavenue\b/g, 'ave')
        .replace(/\bboulevard\b/g, 'blvd')
        .replace(/\bdrive\b/g, 'dr')
        .replace(/\blane\b/g, 'ln')
        .replace(/\s+/g, '-');

    // Normalize town
    const formattedTown = town.toLowerCase().trim().replace(/\s+/g, '-');

    return `https://www.countyoffice.org/${formattedRoad}-${formattedTown}-${state.toLowerCase()}-property-records/`;
}

async function saveAddressesBatch(rows) {
    if (!rows.length) return;

    try {
        const { data, error } = await supabase
            .from('nj_properties')
            .insert(rows)
            .select(); // Returns inserted rows

        if (error) {
            console.error('Batch Insert error:', error.message);
        } else {
            console.log(`Inserted ${data.length} rows`);
        }
    } catch (err) {
        console.error('Unexpected error inserting batch:', err.message);
    }
}

async function gotoWithRetry(page, url, maxRetries = 5, initialBackoff = 2000) {
    let attempt = 0;
    let backoff = initialBackoff;

    while (attempt < maxRetries) {
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            return;
        } catch (err) {
            attempt++;
            console.warn(`Attempt ${attempt} failed for ${url}: ${err.message}`);

            if (attempt === maxRetries) {
                throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts`);
            }

            await new Promise(resolve => setTimeout(resolve, backoff));
            backoff *= 2;
        }
    }
}

const thisFilePath = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1]) === path.resolve(thisFilePath)) {
    scrapeAddresses(); // default 3s delay between pages
}

export default scrapeAddresses;
