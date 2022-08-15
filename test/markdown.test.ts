import { expect } from 'chai';
import { providers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import { cashFlow, fetchTransactions } from '../src/lib/cashflow';
import { getAddressMarkdown, getBlockMarkdown, getCashFlowMarkdown, getProviderMarkdown } from '../src/lib/markdown';
import { createProvider } from '../src/lib/provider';

import * as token from './artifacts/LDToken.json';
import * as usdcCode from './data/fuji-0x5425890298aed601595a70ab815c96711a31bc65.json';
import * as blocks from './data/fuji-972388-972394.json';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionHashes = require('../data/functionHashes.min.json') as { [hash: string]: string };

describe('markdown', () => {
    describe('getProviderMarkdown', () => {
        it('should return `Connection` and `Explorer` URLs', () => {
            const provider = createProvider('fuji');
            expect(getProviderMarkdown(provider)).to.be.equal(`### Network \`fuji\`

#### Connection
https://api.avax-test.network/ext/bc/C/rpc

#### Explorer
https://testnet.snowtrace.io
`);
        });

        it('should return only `Connection` URL when RPC is not known', () => {
            const provider = createProvider('http://localhost:1234');
            expect(getProviderMarkdown(provider)).to.be.equal(`### Network

#### Connection
http://localhost:1234
`);
        });

        ['homestead', 'mainnet'].forEach(network =>
            it(`should return \`Connection\` and \`Explorer\` URLs for Etherscan \`${network}\` provider`, () => {
                const provider = createProvider(network);
                expect(getProviderMarkdown(provider)).to.be.equal(`### Network \`${network}\`

#### Connection
https://api.etherscan.io

#### Explorer
https://etherscan.io
`);
            })
        );

        ['ropsten', 'rinkeby', 'kovan', 'goerli'].forEach(network =>
            it(`should return \`Connection\` and \`Explorer\` URLs for Etherscan \`${network}\` testnet provider`, () => {
                const provider = createProvider(network);
                expect(getProviderMarkdown(provider)).to.be.equal(`### Network \`${network}\`

#### Connection
https://api-${network}.etherscan.io

#### Explorer
https://${network}.etherscan.io
`);
            })
        );
    });

    describe('getBlockMarkdown', () => {
        it('should return block Markdown when explorer url is present', () => {
            const provider = createProvider('fuji');
            expect(getBlockMarkdown(provider, blocks[0]!)).to.be.equal(`### Block 972388

- Block Hash: \`0xa926afe8a5e97a9516a62cfe0cb86367ef12d2bea17fe919bb30882a9cb769bd\`
- Timestamp: Tue, 31 Aug 2021 09:17:22 GMT

### Explorer

https://testnet.snowtrace.io/block/972388
`);
        });

        it('should return block Markdown when explorer url is not present', () => {
            const provider = createProvider('http://localhost');
            expect(getBlockMarkdown(provider, blocks[0]!)).to.be.equal(`### Block 972388

- Block Hash: \`0xa926afe8a5e97a9516a62cfe0cb86367ef12d2bea17fe919bb30882a9cb769bd\`
- Timestamp: Tue, 31 Aug 2021 09:17:22 GMT
`);
        });
    });

    describe('getCodeMarkdown', () => {
        it('should return code Markdown when both explorer url and functions are present', () => {
            const provider = createProvider('fuji');
            expect(getAddressMarkdown(provider, '0x123', token.deployedBytecode, functionHashes)).to.be
                .equal(`### Functions

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
            expect(getAddressMarkdown(provider, '0x123', '0x1234567890')).to.be.equal(`### Functions

_Functions might not be properly identified_

\`\`\`solidity
\`\`\`

### Explorer

https://testnet.snowtrace.io/address/0x123
`);
        });

        it('should return code Markdown when `explorerUrl` is not defined', () => {
            const provider = createProvider('http://localhost:1234');
            expect(getAddressMarkdown(provider, '0x123', token.deployedBytecode, functionHashes)).to.be
                .equal(`### Functions

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
            expect(getAddressMarkdown(provider, '0x123', '0x1234567890')).to.be.equal(`### Functions

_Functions might not be properly identified_

\`\`\`solidity
\`\`\`
`);
        });

        it('should return address Markdown when explorer url is present', () => {
            const provider = createProvider('fuji');
            expect(getAddressMarkdown(provider, '0x123', '0x')).to.be.equal(`### Explorer

https://testnet.snowtrace.io/address/0x123
`);
        });

        it('should return address Markdown when explorer url is not present', () => {
            const provider = createProvider('http://localhost:1234');
            expect(getAddressMarkdown(provider, '0x123', '0x')).to.be.equal(``);
        });

        it('should return code Markdown for USDC Token in Fuji', () => {
            const provider = createProvider('fuji');

            expect(getAddressMarkdown(provider, '0x5425890298aed601595a70ab815c96711a31bc65', usdcCode, functionHashes))
                .to.be.equal(`### Functions

_Functions might not be properly identified_

\`\`\`solidity
implementation()
changeAdmin(address)
admin()
upgradeTo(address)
upgradeToAndCall(address,bytes)
\`\`\`

### Explorer

https://testnet.snowtrace.io/address/0x5425890298aed601595a70ab815c96711a31bc65
`);
        });
    });

    describe('getCashFlowReport', () => {
        it('should format cashflow report', async () => {
            const getBlock = (blockNumber: number) => Promise.resolve(blocks[blockNumber - 972388] as any);

            const txs = (
                await fetchTransactions(null as any as providers.Provider, getBlock, { from: 972390, to: 972394 })
            ).map(tx => {
                return {
                    // from: tx.from,
                    // to: tx.to,
                    ...tx,
                    value: (tx.value as any as { hex: string }).hex.bn(),
                    // data: tx.data,
                };
            });

            const report = cashFlow(txs);

            const contractAddresses = new Set<string>();
            contractAddresses.add('0xEFD4c7a66787019e1c37276BD4ace58fC2404583');
            contractAddresses.add('0x327E991BDF289CB1F3c7a5cA5C597B244c7F7549');
            contractAddresses.add('0xF0aC6C27b796B57363a0D801399b1D8dA0DaeFB5');

            expect(getCashFlowMarkdown(report, contractAddresses)).to.be.equal(`# Ether Cash Flow Report

## Total **${formatEther(report.total)}**

## Contract Transactions **${report.contractTxsPerc.toFixed(2)} %**

## Contract Creation Transactions **${report.contractCreationTxsPerc.toFixed(2)} %**

## Senders

0x2192E18EAf3a62037C7F6595114b9FeA318d9B32 EOA: 30.0
0x572f4D80f10f663B5049F789546f25f70Bb62a7F EOA: 25.0
0xEFD4c7a66787019e1c37276BD4ace58fC2404583 Contract: 4.8
0x22Ae05D7a3E6e823B6b47fB092e9DF87C41f0Bc2 EOA: 5.0
0xBe5317D9D326af55c1483C1FFd23378a5c3528b8 EOA: 0.499054335407883057
0x7487e9af633e284E4305442CAA9087E87e78043d EOA: 0.55
0xB9792af2d795B341C8b9f84aC2026D317fCa757F EOA: 22.569472009983375986
0x327E991BDF289CB1F3c7a5cA5C597B244c7F7549 Contract: 2.3
0x454ee4Ac5e8f6c3633f3470bBe5dD1650741103f EOA: 25.0
0x05Ee8A087EB0d53B4AC74b81E70fE28f1F4A51f3 EOA: 0.3

## Receivers

0xC20a23e406CD9730846Bc2f9b84Ad6F9A65B3147 EOA: 55.0
0x1fAf10B02273A241a1b3134b7B7BA8C9EeB8e3C6 EOA: 5.0
0x7E3411B04766089cFaa52DB688855356A12f05D1 EOA: 35.468526345391259043
0xF0aC6C27b796B57363a0D801399b1D8dA0DaeFB5 Contract: 5.0
0x7F06C6411753F2773612eD4C77650Eb70ac6a214 EOA: 0.55
0x5230a31456c07011206082B3e9E86b234cBa7db3 EOA: 5.0
0x78FB0B3E9b195c3446a592e50f0367188004afDd EOA: 5.0
0xd0051BBb4e36FC74E876f8872653B27D6c0a3FAB EOA: 5.0
`);
        });
    });
});
