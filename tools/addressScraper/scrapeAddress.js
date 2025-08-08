import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { supabase } from '../../supabase/supabaseClient.js';

puppeteer.use(StealthPlugin());

async function scrapeAddresses(inputAddress) {
    const url = formatPropertyAddressURL(inputAddress)
    console.log(`Formatted URL: ${url}`);
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const addresses = await page.evaluate(() => {
            const rows = document.querySelectorAll('#property-records-by table tbody tr');
            return Array.from(rows)
                .map(row => {
                    const link = row.querySelector('td:nth-child(1) a');
                    return link ? link.textContent.trim() : null;
                })
                .filter(Boolean);
        });
        console.log(`Found ${addresses.length} addresss:\n`, addresses);

        if (addresses.length) {
            await saveAddressToDB(addresses);
        }
        
    } catch (err) {
        console.error(`Error scraping:`, err.message);
    } finally {
        await browser.close();
    }
    
}

function formatPropertyAddressURL(inputAddress) {
    const formatted = inputAddress
        .toLowerCase()
        .trim()
        .replace(/\bstreet\b/g, 'st')
        .replace(/\broad\b/g, 'rd')
        .replace(/\bavenue\b/g, 'ave')
        .replace(/\bboulevard\b/g, 'blvd')
        .replace(/\bdrive\b/g, 'dr')
        .replace(/\blane\b/g, 'ln')
        .replace(/\s+/g, '-');
    return `https://www.countyoffice.org/${formatted}-property-records/`;
}

async function saveAddressToDB(addresses) {
    const {data, error } = await supabase
        .from('properties')
        .insert(
            addresses.map(address => ({ address }))
        )
        .select();

    if (error) {
        console.error('Failed to insert into Supabase:', error.message);
    } else {
        console.log('Inserted:', data);
    }
}

export default scrapeAddresses;

import { fileURLToPath } from 'url';
import path from 'path';

const thisFilePath = fileURLToPath(import.meta.url);

if (path.resolve(process.argv[1]) === path.resolve(thisFilePath)) {
    const inputArgs = process.argv.slice(2).join(' ');
    scrapeAddresses(inputArgs);
}