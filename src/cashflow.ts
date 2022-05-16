import { BigNumber, constants, providers, Transaction } from "ethers";
import { BlockWithTransactions } from "@ethersproject/abstract-provider";
import { BlockRange } from "./parse";

/**
 * Keeps track of account balances.
 * It can be used for both sender and receiver accounts.
 */
export type Balances = { [from: string]: BigNumber };

export async function fetchTransactions(provider: providers.Provider, getBlock: (block: number) => Promise<BlockWithTransactions>, blockRange: BlockRange): Promise<Transaction[]> {
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
        const block = await getBlock(blockNumber);
        for (const tx of block.transactions) {
            transactions.push(tx);
        }

        blockNumber += 1;
    }

    return transactions;
}

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
    const senders: { [to: string]: BigNumber } = {};
    const receivers: { [from: string]: BigNumber } = {};

    for (const tx of transactions) {
        if (!tx.value.isZero()) {
            total = total.add(tx.value);
            updateBalance(senders, tx.from ?? constants.AddressZero, tx.value);
            updateBalance(receivers, tx.to ?? constants.AddressZero, tx.value);
        }
    }

    return { total, senders, receivers };
}

function updateBalance(balances: Balances, address: string, amount: BigNumber) {
    const previousAmount = balances[address] ?? constants.Zero;
    balances[address] = previousAmount.add(amount);
}
