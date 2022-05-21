import { providers } from "ethers";
import ganache from "ganache";

const provider = new providers.Web3Provider(ganache.provider({
    fork: {
        url: 'https://api.avax-test.network/ext/bc/C/rpc',
    }
}) as any);

async function main() {
    const code = await provider.getCode('0x5425890298aed601595a70ab815c96711a31bc65');
    console.log(code);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });     
