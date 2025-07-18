const getImage = require('./getImage');
const testAddress = '305 Kings Rd, Madison, NJ 07940';

getImage(testAddress).then((filepath) => {
    if (filepath) {
        console.log(`Image available at: ${filepath}`);
    }
});