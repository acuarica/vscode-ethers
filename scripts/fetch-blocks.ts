import { providers } from "ethers";
import ganache from "ganache";

const FORK_BLOCK_NUMBER = 972394;

const provider = new providers.Web3Provider(ganache.provider({
    fork: {
        url: 'https://api.avax-test.network/ext/bc/C/rpc',
        blockNumber: FORK_BLOCK_NUMBER,
    }
}) as any);

async function main() {
    const blocks = [];
    for (let blockNumber = 972388; blockNumber <= FORK_BLOCK_NUMBER; blockNumber++) {
        const block = await provider.getBlockWithTransactions(blockNumber);
        blocks.push(block);
    }
    console.log(JSON.stringify(blocks));
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });     
