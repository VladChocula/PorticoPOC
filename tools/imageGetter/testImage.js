import getImage from './getImage.js';

async function main () {
    const inputArgs = process.argv.slice(2);
    if (inputArgs.length === 0) {
        console.error('Please provide an address as a command line argument as a string.');
        process.exit(1);
    }

    const address = inputArgs.join(' ');
    try {
        await getImage(address);
    } catch (err) {
        console.error(`Error:`, err.message);
    }
}

main();