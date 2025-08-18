import path from 'path';
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 
 * @param {string} address  - The address that an image will be retrieved for.
 *
 * @returns  {Promise<void>}
 */
async function getImage(address) {
    const apiKey = process.env.GOOGLE_MAPS_APIKEY;
    if (!apiKey) throw new Error('Missing GOOGLE_MAPS_APIKEY in .env file.');

    const encodedAddress = encodeURIComponent(address);
    const imgUrls = [
        { url: `https://maps.googleapis.com/maps/api/streetview?size=2000x2000&fov=30&pitch=0&location=${encodedAddress}&key=${apiKey}`, fov: '30'},
        { url: `https://maps.googleapis.com/maps/api/streetview?size=640x640&fov=45&location=${encodedAddress}&key=${apiKey}`, fov: '45'},
        { url: `https://maps.googleapis.com/maps/api/streetview?size=640x640&fov=75&location=${encodedAddress}&key=${apiKey}`, fov: '75'},
        { url: `https://maps.googleapis.com/maps/api/streetview?size=640x640&fov=90&location=${encodedAddress}&key=${apiKey}`, fov: '90'},
        { url: `https://maps.googleapis.com/maps/api/streetview?size=640x640&fov=120&location=${encodedAddress}&key=${apiKey}`, fov: '120'},
    ];

    const outputDir = path.join(__dirname, 'images');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    try {
            for (const imgUrl of imgUrls) {
                const response = await axios.get(imgUrl.url, { responseType: 'arraybuffer' });
                const safeFilename = address.replace(/[^\w\d]/g, '_') + `_fov_${imgUrl.fov}.jpg`;
                const outputPath = path.join(outputDir, safeFilename);

                fs.writeFileSync(outputPath, response.data);
                console.log(`✅ Image saved to ${outputPath}`);
            }
    } catch (err) {
        console.error(`❌ Failed to get image for "${address}":`, err.message);
        return null;
    }
}

export default getImage;