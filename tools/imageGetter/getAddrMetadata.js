require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function getAddrMetaData(address) {
    const apiKey = process.env.GOOGLE_MAPS_APIKEY;
    if (!apiKey) throw new Error('Missing GOOGLE_MAPS_APIKEY in .env file.');

    const encodedAddress = encodeURIComponent(address);
    const addressMetaData = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodedAddress}&key=${apiKey}`;

    try {
        const response = await axios.get(addressMetaData, { responseType: 'arraybuffer'});
        if (response.status == "OK")
        {
            console.log(JSON.stringify(response));
        }
    } catch (err) {
        console.error(`❌ Failed to get metadata for "${address}":`, err.message);
    }
}

module.exports = getAddrMetadata;