import { waffleChai } from '@ethereum-waffle/chai';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { ContractFactory, providers, Wallet } from 'ethers';
import { computeAddress } from 'ethers/lib/utils';
import ganache from 'ganache';
import { EthersMode } from '../src/lib/mode';
import { createProvider, execCall } from '../src/lib/provider';
import * as token from './artifacts/LDToken.json';
import './utils/str';

use(chaiAsPromised);
use(waffleChai);

describe('provider', function () {
    describe('createProvider', function () {
        it('should return JSON-RPC provider for unknown network', () => {
            const provider = createProvider('http://localhost:1234');
            expect(provider.connectionUrl).to.be.equal('http://localhost:1234');
            expect(provider.explorerUrl).to.be.undefined;
            expect(provider.blockExplorerUrl(1234)).to.be.null;
            expect(provider.addressExplorerUrl('0x1234')).to.be.null;
        });

        it('should return JSON-RPC provider for network `fuji`', () => {
            const provider = createProvider('fuji');
            expect(provider.connectionUrl).to.be.equal('https://api.avax-test.network/ext/bc/C/rpc');
            expect(provider.explorerUrl).to.be.equal('https://testnet.snowtrace.io');
            expect(provider.blockExplorerUrl(1234)).to.be.equal('https://testnet.snowtrace.io/block/1234');
            expect(provider.addressExplorerUrl('0x1234')).to.be.equal('https://testnet.snowtrace.io/address/0x1234');
        });

        ['homestead', 'mainnet'].forEach(network =>
            it(`should return Etherscan provider for network \`${network}\``, () => {
                const provider = createProvider(network);
                expect(provider.connectionUrl).to.be.equal('https://api.etherscan.io');
                expect(provider.explorerUrl).to.be.equal('https://etherscan.io');
                expect(provider.blockExplorerUrl(1234)).to.be.equal('https://etherscan.io/block/1234');
                expect(provider.addressExplorerUrl('0x1234')).to.be.equal('https://etherscan.io/address/0x1234');
            })
        );

        ['ropsten', 'rinkeby', 'kovan', 'goerli'].forEach(network =>
            it(`should return Etherscan provider for testnet network \`${network}\``, () => {
                const provider = createProvider(network);
                expect(provider.connectionUrl).to.be.equal(`https://api-${network}.etherscan.io`);
                expect(provider.explorerUrl).to.be.equal(`https://${network}.etherscan.io`);
                expect(provider.blockExplorerUrl(1234)).to.be.equal(`https://${network}.etherscan.io/block/1234`);
                expect(provider.addressExplorerUrl('0x1234')).to.be.equal(
                    `https://${network}.etherscan.io/address/0x1234`
                );
            })
        );
    });

    describe('execCall', function () {
        this.timeout(4000);

        let provider: providers.Provider;
        let ldtokenAddress: string;

        const createProvider = (_network: string) => provider;

        const privateKey = '0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6';

        before(async () => {
            provider = new providers.Web3Provider(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                ganache.provider({
                    quiet: true,
                    wallet: {
                        accounts: [{ balance: '0xffffffffffffffffffffff', secretKey: privateKey }],
                    },
                }) as any
            );

            const deployer = new Wallet(privateKey, provider);
            expect(await provider.getBalance(deployer.address)).to.be.deep.equal('0xffffffffffffffffffffff'.bn());

            const factory = new ContractFactory(token.abi, token.bytecode, deployer);
            const contract = await factory.deploy('LD Token', 'LDT');
            ldtokenAddress = contract.address;
        });

        it('should return value from view calls', async () => {
            const mode = new EthersMode();
            mode.net('_unused');
            mode.address(ldtokenAddress.asAddress());

            {
                const call = mode.call('name() view returns (string)'.asCall());
                expect(await execCall(call.resolve(), createProvider)).to.be.deep.equal(['LD Token']);
            }
            {
                const call = mode.call('symbol() view returns (string)'.asCall());
                expect(await execCall(call.resolve(), createProvider)).to.be.deep.equal(['LDT']);
            }
            {
                const call = mode.call(`balanceOf(${computeAddress(privateKey)}) view returns (uint256)`.asCall());
                expect(await execCall(call.resolve(), createProvider)).to.be.deep.equal(['0'.bn()]);
            }
        });

        it('should reject call when network is not provided', async () => {
            const mode = new EthersMode();
            mode.address(ldtokenAddress.asAddress());

            {
                const call = mode.call('name() view returns (string)'.asCall());
                await expect(execCall(call.resolve(), createProvider)).to.be.eventually.rejectedWith(
                    'No network provided'
                );
            }
        });

        it('should return value from view calls using alias and `this`', async () => {
            const mode = new EthersMode();
            mode.net('_unused');
            mode.address(`${ldtokenAddress} as token`.asAddress());

            mode.address(`${computeAddress(privateKey)}`.asAddress());
            {
                const call = mode.call('token.balanceOf(this) view returns (uint256)'.asCall());
                expect(await execCall(call.resolve(), createProvider)).to.be.deep.equal(['0'.bn()]);
            }
        });

        it('should sign transaction using signers', async () => {
            const mode = new EthersMode();
            mode.net('_unused');
            mode.address(`${ldtokenAddress} as token`.asAddress());

            mode.address(`${privateKey}`.asAddress());
            {
                const call = mode.call('token.balanceOf(this) view returns (uint256)'.asCall());
                expect(await execCall(call.resolve(), createProvider)).to.be.deep.equal(['0'.bn()]);
            }
            {
                const call = mode.call('token._mint(this, uint256 5000)'.asCall());
                await execCall(call.resolve(), createProvider);
            }
            {
                const call = mode.call('token.balanceOf(this) view returns (uint256)'.asCall());
                expect(await execCall(call.resolve(), createProvider)).to.be.deep.equal(['5000'.bn()]);
            }
        });

        it('should reject transaction because account does not have sufficient funds for intrinsic cost', async () => {
            const mode = new EthersMode();
            mode.net('_unused');

            mode.address(`${ldtokenAddress} as token`.asAddress());
            mode.address(`0x0000000000000000000000000000000000000000000000000000000000000001`.asAddress());
            {
                const call = mode.call('token._mint(this, uint256 5000)'.asCall());
                await expect(execCall(call.resolve(), createProvider)).to.be.eventually.rejectedWith(
                    'insufficient funds for intrinsic transaction cost'
                );
            }
        });
    });
});
