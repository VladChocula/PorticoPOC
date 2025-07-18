const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeAddresses() {
    const url = 'https://www.countyoffice.org/kings-rd-madison-nj-property-records/';
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const content = await page.content();
        fs.writeFileSync('output.html', content);
        console.log('HTML saved to output.html');
        const addresses = await page.evaluate(() => {
            const rows = document.querySelectorAll('#property-records-by table tbody tr');
            const results = [];

            rows.forEach((row) => {
                const link = row.querySelector('td:nth-child(1) a');
                if (link) {
                    results.push(link.textContent.trim());
                }
            });

            return results;
        });
        console.log(`Found ${addresses.length} addresss:\n`, addresses);
    } catch (err) {
        console.error(`Error scraping:`, err.message);
    } finally {
        await browser.close();
    }
    
}

scrapeAddresses();