import { BigNumber, constants, providers, Transaction } from "ethers";
import { BlockWithTransactions } from "@ethersproject/abstract-provider";
import { BlockRange } from "./parse";

/**
 * Keeps track of account balances.
 * It can be used for both sender and receiver accounts.
 */
export type Balances = { [address: string]: BigNumber };

/**
 * Fetch and flatten transactions from blocks specified in the `blockRange`.
 * 
 * @param provider the provider to use to fetch the current block number when `to` it is not specified.
 * @param getBlockFn the actual function to use to fetch blocks.
 * @param blockRange specifies the `from` and optional `to` block numbers to fetch transactions from.
 * @returns the list of transactions contained in the specified block range.
 */
export async function fetchTransactions(provider: providers.Provider, getBlockFn: (block: number) => Promise<BlockWithTransactions>, blockRange: BlockRange): Promise<Transaction[]> {
    if (blockRange.to === undefined) {
        blockRange.to = await provider.getBlockNumber();
    }

    let blockNumber, blockTo;
    if (blockRange.from <= blockRange.to) {
        blockNumber = blockRange.from;
        blockTo = blockRange.to;
    } else {
        blockNumber = blockRange.to;
        blockTo = blockRange.from;
    }

    const transactions = [];
    while (blockNumber <= blockTo) {
        const block = await getBlockFn(blockNumber);
        for (const tx of block.transactions) {
            transactions.push(tx);
        }

        blockNumber += 1;
    }

    return transactions;
}

/**
 * Calculates the Ether Cash Flow from the list of `transactions`.
 * Each transaction in `transactions` is just a slice of the transaction object returned by Ethers.js.
 * 
 * @param transactions the list of transactions to calculate the Ether Cash Flow.
 * @returns the `total` of Ether transferred,
 * and the list of `senders` and `receivers` the participated in the list of transactions.
 */
export function cashFlow(transactions:
    {
        from?: string,
        to?: string,
        value: BigNumber
    }[]
): {
    total: BigNumber,
    senders: Balances,
    receivers: Balances,
} {
    let total = constants.Zero;
    const senders: Balances = {};
    const receivers: Balances = {};

    for (const tx of transactions) {
        if (!tx.value.isZero()) {
            total = total.add(tx.value);
            updateBalance(senders, tx.from ?? constants.AddressZero, tx.value);
            updateBalance(receivers, tx.to ?? constants.AddressZero, tx.value);
        }
    }

    return { total, senders, receivers };

    /**
     * Updates the `balances` by adding or updating the `address` by `amount`.
     * 
     * @param balances the map to add or update the `address` by `amount`.
     * @param address the address that sent or received Ether.
     * @param amount the amount of Ether that was sent or received.
     */
    function updateBalance(balances: Balances, address: string, amount: BigNumber) {
        const previousAmount = balances[address] ?? constants.Zero;
        balances[address] = previousAmount.add(amount);
    }
}

/**
 * Checks whethen the given `address` is a contract address.
 * 
 * @param provider the provider to use to fetch the code of the given `address`.
 * @param address the address to query.
 * @returns `true` is the given `address` is a contract address.
 * This is defined by having its code different from `0x`.
 * Otherwise, returns `false`.
 */
export async function isContract(provider: providers.Provider, address: string): Promise<boolean> {
    const code = await provider.getCode(address);
    return code !== '0x';
}