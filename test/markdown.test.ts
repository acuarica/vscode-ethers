import { expect } from "chai";
import { getBlockMarkdown, getCodeMarkdown, getProviderMarkdown } from "../src/lib/markdown";
import { createProvider } from "../src/lib/provider";
import * as blocks from "./data/fuji-972388-972394.json";
import * as token from "../artifacts/LDToken.json";

describe('markdown', () => {

    describe('getProviderMarkdown', () => {

        it('should return `Connection` and `Explorer` URLs', () => {
            const provider = createProvider('fuji');
            expect(getProviderMarkdown(provider)).to.be.equal(`### Network \`fuji\`

#### Connection
https://api.avax-test.network/ext/bc/C/rpc

#### Explorer
https://testnet.snowtrace.io/address/
`);
        });

        it('should return only `Connection` URL when RPC is not known', () => {
            const provider = createProvider('http://localhost:1234');
            expect(getProviderMarkdown(provider)).to.be.equal(`### Network

#### Connection
http://localhost:1234
`);
        });

        ['homestead', 'mainnet'].forEach(network => it(`should return \`Connection\` and \`Explorer\` URLs for Etherscan \`${network}\` provider`, () => {
            const provider = createProvider(network);
            expect(getProviderMarkdown(provider)).to.be.equal(`### Network \`${network}\`

#### Connection
https://api.etherscan.io

#### Explorer
https://etherscan.io/address/
`);
        }));

        ['ropsten', 'rinkeby', 'kovan', 'goerli'].forEach(network => it(`should return \`Connection\` and \`Explorer\` URLs for Etherscan \`${network}\` testnet provider`, () => {
            const provider = createProvider(network);
            expect(getProviderMarkdown(provider)).to.be.equal(`### Network \`${network}\`

#### Connection
https://api-${network}.etherscan.io

#### Explorer
https://${network}.etherscan.io/address/
`);
        }));

    });

    describe('getBlockMarkdown', () => {

        it('should return `Connection` and `Explorer` URLs', () => {
            expect(getBlockMarkdown(blocks[0])).to.be.equal(`### Block 972388

- Block Hash: \`0xa926afe8a5e97a9516a62cfe0cb86367ef12d2bea17fe919bb30882a9cb769bd\`
- Timestamp: Tue, 31 Aug 2021 09:17:22 GMT
`);
        });

    });

    describe('getCodeMarkdown', () => {

        it('should return code Markdown when both explorer url and functions are present', () => {
            const provider = createProvider('fuji');
            expect(getCodeMarkdown(provider, '0x123', token.deployedBytecode)).to.be.equal(`### Functions

_Functions might not be properly identified_

\`\`\`solidity
_mint(address,uint256)
symbol()
transfer(address,uint256)
allowance(address,address)
balanceOf(address)
nonces(address)
name()
approve(address,uint256)
totalSupply()
transferFrom(address,address,uint256)
decimals()
DOMAIN_SEPARATOR()
\`\`\`

### Explorer

https://testnet.snowtrace.io/address/0x123
`);
        });

        it('should return code Markdown when only explorer url is present but functions are empty', () => {
            const provider = createProvider('fuji');
            expect(getCodeMarkdown(provider, '0x123', '0x1234567890')).to.be.equal(`### Functions

_Functions might not be properly identified_

\`\`\`solidity
\`\`\`

### Explorer

https://testnet.snowtrace.io/address/0x123
`);
        });

        it('should return code Markdown when `explorerUrl` is not defined', () => {
            const provider = createProvider('http://localhost:1234');
            expect(getCodeMarkdown(provider, '0x123', token.deployedBytecode)).to.be.equal(`### Functions

_Functions might not be properly identified_

\`\`\`solidity
_mint(address,uint256)
symbol()
transfer(address,uint256)
allowance(address,address)
balanceOf(address)
nonces(address)
name()
approve(address,uint256)
totalSupply()
transferFrom(address,address,uint256)
decimals()
DOMAIN_SEPARATOR()
\`\`\`
`);
        });

        it('should return code Markdown when neither explorer url nor functions are present', () => {
            const provider = createProvider('http://localhost:1234');
            expect(getCodeMarkdown(provider, '0x123', '0x1234567890')).to.be.equal(`### Functions

_Functions might not be properly identified_

\`\`\`solidity
\`\`\`
`);
        });

    });

});
