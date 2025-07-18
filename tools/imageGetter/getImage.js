require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const axios = require('axios');
const path = require('path');

/**
 * 
 * @param {string} address  - The address that an image will be retrieved for.
 *
 * @returns  {Promise<string>} - The filepath where the image was saved.
 */
async function getImage(address) {
    const apiKey = process.env.GOOGLE_MAPS_APIKEY;
    if (!apiKey) throw new Error('Missing GOOGLE_MAPS_APIKEY in .env file.');

    const encodedAddress = encodeURIComponent(address);
    const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodedAddress}&key=${apiKey}`;

    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        const safeFilename = address.replace(/[^\w\d]/g, '_') + '.jpg';
        const outputDir = path.join(__dirname, 'images');
        const outputPath = path.join(outputDir, safeFilename);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        fs.writeFileSync(outputPath, response.data);
        console.log(`✅ Image saved to ${outputPath}`);
        return outputPath;
    } catch (err) {
        console.error(`❌ Failed to get image for "${address}":`, err.message);
        return null;
    }
}

module.exports = getImage;