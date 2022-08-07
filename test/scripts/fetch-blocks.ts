import { writeFileSync } from "fs";
import { createProvider } from "../../src/lib/provider";

async function main() {
    if (process.argv.length <= 3) {
        throw 'Invalid arguments. Run with <network> <fromBlock> <toBlock>';
    }

    const argc = process.argv.length;

    const network = process.argv[argc - 3];
    const fromBlock = parseInt(process.argv[argc - 2]);
    const toBlock = parseInt(process.argv[argc - 1]);

    const provider = createProvider(network);

    const blocks = [];
    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
        console.info(`Fetching block ${blockNumber}...`);

        const block = await provider.getBlockWithTransactions(blockNumber);
        blocks.push(block);
    }
    const outputPath = `./test/data/${network}-${fromBlock}-${toBlock}.json`;
    console.info(`Writing JSON blocks into ${outputPath}`);

    const output = JSON.stringify(blocks);
    writeFileSync(outputPath, output);
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });     
