import { expect } from "chai";
import { providers } from "ethers";
import ganache from "ganache";
import { cashFlow, fetchTransactions } from "../src/lib/cashflow";
import * as blocks from "./data/fuji-972388-972394.json";
import './utils/str';

describe('cashflow', function () {

    describe('fetchTransactions', function () {

        this.timeout(5000);

        let provider: providers.Provider;

        const getBlock = (block: number) => provider.getBlockWithTransactions(block);

        before(async () => {
            provider = new providers.Web3Provider(ganache.provider({
                logging: {
                    quiet: true
                },
                fork: {
                    url: 'https://api.avax-test.network/ext/bc/C/rpc',
                    blockNumber: 972394,
                },
                database: {
                    dbPath: '.ganache-972394',
                }
            }) as any);

        });

        it('should fetch latest transactions', async () => {
            const transactions = await fetchTransactions(provider, getBlock, { from: 972390, to: 972393 });
            expect(transactions.length).to.be.equal(33);
        });

        it('should fetch latest transactions with inverted range', async () => {
            const transactions = await fetchTransactions(provider, getBlock, { from: 972393, to: 972390 });
            expect(transactions.length).to.be.equal(33);
        });

        it('should fetch latest transactions without specifying `to` block', async () => {
            const transactions = await fetchTransactions(provider, getBlock, { from: 972390 });
            expect(transactions.length).to.be.equal(42);
        });

    });

    describe('cashFlow', () => {

        it('should return cash flow', () => {
            const txs = [
                { from: '0xa', to: '0xb', value: '2'.bn(), data: '0x' },
                { from: '0xb', to: '0xc', value: '5'.bn(), data: '0x' },
                { from: '0xf', to: '0xf', value: '10'.bn(), data: '0x123' },
            ];
            const report = cashFlow(txs);
            expect(report).to.be.deep.equal({
                total: '17'.bn(),
                contractTxsPerc: 100 / 3,
                senders: {
                    '0xa': '2'.bn(),
                    '0xb': '5'.bn(),
                    '0xf': '10'.bn(),
                },
                receivers: {
                    '0xb': '2'.bn(),
                    '0xc': '5'.bn(),
                    '0xf': '10'.bn(),
                }
            });
        });

        it('should allow addresses to be sender & receiver in the same transaction', () => {
            const txs = [
                { from: '0xa', to: '0xb', value: '2'.bn(), data: '0x' },
                { from: '0xf', to: '0xf', value: '10'.bn(), data: '0x' },
            ];
            const report = cashFlow(txs);
            expect(report).to.be.deep.equal({
                total: '12'.bn(),
                contractTxsPerc: 0,
                senders: {
                    '0xa': '2'.bn(),
                    '0xf': '10'.bn(),
                },
                receivers: {
                    '0xb': '2'.bn(),
                    '0xf': '10'.bn(),
                }
            });
        });

        it('should update balances for addresses that send or receive multiple times', () => {
            const txs = [
                { from: '0xa', to: '0xb', value: '1'.bn(), data: '0x' },
                { from: '0xb', to: '0xc', value: '2'.bn(), data: '0x1' },
                { from: '0xa', to: '0xd', value: '3'.bn(), data: '0x' },
                { from: '0xe', to: '0xc', value: '4'.bn(), data: '0x2' },
            ];
            const report = cashFlow(txs);
            expect(report).to.be.deep.equal({
                total: '10'.bn(),
                contractTxsPerc: 100 / 2,
                senders: {
                    '0xa': '4'.bn(),
                    '0xb': '2'.bn(),
                    '0xe': '4'.bn(),
                },
                receivers: {
                    '0xb': '1'.bn(),
                    '0xc': '6'.bn(),
                    '0xd': '3'.bn(),
                }
            });
        });

        it('should return cash from from `txs`', async () => {
            const getBlock = (blockNumber: number) => Promise.resolve(blocks[blockNumber - 972388] as any);

            const txs = (await fetchTransactions(null as any, getBlock, { from: 972390, to: 972394 }))
                .map(tx => {
                    return {
                        from: tx.from,
                        to: tx.to,
                        value: (tx.value as any as { hex: string }).hex.bn(),
                        data: tx.data,
                    };
                });

            const report = cashFlow(txs);
            expect(report.total).to.be.deep.equal('116018526345391259043'.bn());
            expect(report.contractTxsPerc.toFixed(2)).to.be.deep.equal('85.71');
        });

    });

});
