import { writeFileSync } from "fs";
import { createProvider } from "../../src/lib/provider";

async function main() {
    const network = 'fuji';
    const address = '0x5425890298aed601595a70ab815c96711a31bc65';

    const provider = createProvider(network);
    const code = await provider.getCode(address);

    const outputPath = `./test/data/${network}-${address}.json`;
    console.info(`Writing JSON code bytecode into ${outputPath}`);

    const output = JSON.stringify(code);
    writeFileSync(outputPath, output);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });     
