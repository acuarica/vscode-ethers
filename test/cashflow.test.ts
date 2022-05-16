import { expect } from "chai";
import { BigNumber } from "ethers";
import { cashFlow, fetchTransactions } from "../src/cashflow";
import { providers } from "ethers";
import ganache from "ganache";

const txs = [
    {
        from: '0x454ee4Ac5e8f6c3633f3470bBe5dD1650741103f',
        to: '0xC20a23e406CD9730846Bc2f9b84Ad6F9A65B3147',
        value: BigNumber.from('0x015af1d78b58c40000'),
    },
    {
        from: '0x572f4D80f10f663B5049F789546f25f70Bb62a7F',
        to: '0xd0051BBb4e36FC74E876f8872653B27D6c0a3FAB',
        value: BigNumber.from('0x4563918244f40000')
    },
    {
        from: '0x18313412fdDe30f42c385133907A9C22fdD7FbF8',
        to: '0xf0b6dB3ee1a7349EA8D3A38Ba839D255cD75eDdF',
        value: BigNumber.from('0x00')
    },
    {
        from: '0xdB1c4c0D1D85D6C075474D31953605beE79D33A8',
        to: '0x7289528A2693aB7F5E9ab11155295033140EE2fF',
        value: BigNumber.from('0x00')
    },
    {
        from: '0xaED87FB6b11762F53986aC68A718a1A11250c682',
        to: '0xf0b6dB3ee1a7349EA8D3A38Ba839D255cD75eDdF',
        value: BigNumber.from('0x00')
    },
    {
        from: '0x05Ee8A087EB0d53B4AC74b81E70fE28f1F4A51f3',
        to: '0x7E3411B04766089cFaa52DB688855356A12f05D1',
        value: BigNumber.from('0x0429d069189e0000')
    },
    {
        from: '0x9B3Df308DBa5121c17063936018FabcE14D26Faa',
        to: '0x7E3411B04766089cFaa52DB688855356A12f05D1',
        value: BigNumber.from('0x00')
    },
    {
        from: '0xE9eAEaF1A23b358f01a03f774E2Fc31AdC3C7b0B',
        to: '0xf0b6dB3ee1a7349EA8D3A38Ba839D255cD75eDdF',
        value: BigNumber.from('0x00')
    },
    {
        from: '0xf50D0F214a0f408992D95D239C1235825EC52CE6',
        to: '0x7E3411B04766089cFaa52DB688855356A12f05D1',
        value: BigNumber.from('0x00')
    }
];

const provider = new providers.Web3Provider(ganache.provider({
    logging: {
        quiet: true
    },
    fork: {
        url: 'https://api.avax-test.network/ext/bc/C/rpc',
        blockNumber: 972394,
    }
}) as any);

describe('fetchTransactions', function () {

    this.timeout(5000);

    it('should fetch latest transactions', async () => {
        const transactions = await fetchTransactions(provider, (block: number) => provider.getBlockWithTransactions(block), { from: 972390, to: 972393 });
        expect(transactions.length).to.be.equal(33);
    });

    it('should fetch latest transactions with inverted range', async () => {
        const transactions = await fetchTransactions(provider, (block: number) => provider.getBlockWithTransactions(block), { from: 972393, to: 972390 });
        expect(transactions.length).to.be.equal(33);
    });

    it('should fetch latest transactions without specifying `to` block', async () => {
        const transactions = await fetchTransactions(provider, (block: number) => provider.getBlockWithTransactions(block), { from: 972390 });
        expect(transactions.length).to.be.equal(42);
    });

});

describe('cashFlow', () => {
    it('should resolve method calls', () => {
        const flow = cashFlow(txs);
        expect(flow.total).to.be.deep.equal(BigNumber.from('30300000000000000000'));
    });
});