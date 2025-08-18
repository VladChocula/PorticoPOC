import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { supabase } from '../../supabase/supabaseClient.js';


puppeteer.use(StealthPlugin());

const NJCounties = [
    'atlantic', 'bergen', 'burlington', 'camden', 'cape_may', 'cumberland', 'essex',
    'gloucester', 'hudson', 'hunterdon', 'mercer', 'middlesex', 'monmouth', 'morris', 
    'ocean', 'passaic', 'salem', 'somerset', 'sussex', 'union', 'warren'
]

function formatCountyUrl(state, county) {
    return `https://www.geographic.org/streetview/usa/${state}/${county}/index.html`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function insertRoadsBatch(rows) {
    if (!rows.length) return;

    const { error } = await supabase
        .from('nj_roads')
        .upsert(rows, { onConflict: ['state', 'county', 'town', 'road_name'], ignoreDuplicates: true});

    if (error) {
        console.error('Batch Insert error:', error.message);
    } else {
        console.log(`Inserted ${rows.length} rows`);
    }
}

async function scrapeCounty(state, county) {
    const countyUrl = formatCountyUrl(state, county);
    console.log(`\n=== County: ${county.toUpperCase()} | URL: ${countyUrl}`);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    try {
        await page.goto(countyUrl, { waitUntil: 'domcontentloaded', timeout:60_000 });

        const towns = await page.evaluate(() => {
            const anchors = Array.from(
                document.querySelectorAll('div.listmain span.listspan ul li a')
            );
            return anchors
                .map(a => ({
                    name: (a.textContent || '').trim(),
                    href: a.getAttribute('href') || ''
                }))
                .filter(t => t.name && t.href.endsWith('.html'));
        });

        console.log(`Found ${towns.length} towns in ${county}.`);

        let rowsBuffer = [];
        const BATCH_SIZE = 500;

        for (const town of towns) {
            const townUrl = new URL(town.href, countyUrl).href;
            console.log(` -> Town: ${town.name} | ${townUrl}`);

            await page.goto(townUrl, { waitUntil: 'domcontentloaded', timeout: 60_000});

            const roadNames = await page.evaluate( () => {
                const anchors = Array.from(
                    document.querySelectorAll('div.listmain span.listspan a')
                );
                return anchors
                    .filter(a => (a.getAttribute('href') || '').includes('view.php'))
                    .map(a => (a.textContent || '').trim())
                    .filter(Boolean);
            });

            console.log(`    Roads found: ${roadNames.length}`);

            //Prepare rows for insert
            const toInsert = roadNames.map( road => ({
                state: state.toUpperCase(),
                county: county.replace(/_/g, ' '),
                town: town.name,
                road_name: road
            }));

            rowsBuffer.push(...toInsert);

            //Flush in batches
            if (rowsBuffer.length >= BATCH_SIZE) {
                await insertRoadsBatch(rowsBuffer.splice(0, rowsBuffer.length));
            }

            await sleep(500);
        }

        if (rowsBuffer.length) {
            await insertRoadsBatch(rowsBuffer);
        }

        console.log(`Finished County: ${county}`);
    } catch (err) {
        console.error(` Error Scraping ${county}:`, err.message);
    } finally {
        await browser.close();
    }
}

async function main() {
    const [stateArg, countyArg] = process.argv.slice(2);
    const state = (stateArg || 'nj').toLowerCase();

    if (countyArg) {
        await scrapeCounty(state, countyArg.toLowerCase());
        return;
    }

    for (const county of NJCounties) {
        await scrapeCounty(state, county);
        await sleep(1500);
    }
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});