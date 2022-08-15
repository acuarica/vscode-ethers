import { ModeProvider } from './provider';
import { Block } from '@ethersproject/abstract-provider';
import { EVM } from 'evm';
import { Balances, CashFlowReport } from './cashflow';
import { formatEther } from 'ethers/lib/utils';

/**
 *
 * @param provider
 * @returns
 */
export function getProviderMarkdown(provider: ModeProvider): string {
    const explorerUrl = provider.explorerUrl ? `\n\n#### Explorer\n${provider.explorerUrl}` : '';
    const name = provider.name ? ` \`${provider.name}\`` : '';
    const content = `### Network${name}\n\n#### Connection\n${provider.connectionUrl}${explorerUrl}\n`;
    return content;
}

/**
 *
 * @param provider
 * @param block
 * @returns
 */
export function getBlockMarkdown(provider: ModeProvider, block: Pick<Block, 'number' | 'hash' | 'timestamp'>): string {
    const sections = [];

    const timestamp = new Date(block.timestamp * 1000).toUTCString();
    sections.push(`### Block ${block.number}\n\n- Block Hash: \`${block.hash}\`\n- Timestamp: ${timestamp}\n`);

    if (provider.explorerUrl) {
        sections.push(`### Explorer\n\n${provider.blockExplorerUrl(block.number)!}\n`);
    }

    return sections.join('\n');
}

/**
 * Generates Markdown content from the given `address`,
 * and `code` if any.
 *
 * The `provider`, if any, is used to provide a link to its explorer URL.
 *
 * @param provider
 * @param address
 * @param code the bytecode stored in this address if this is a contract address.
 * If this address is not a contract address, use `0x`.
 * @param functionHashes
 * @returns
 */
export function getAddressMarkdown(
    provider: ModeProvider,
    address: string,
    code: string | Buffer,
    functionHashes: { [hash: string]: string } = {}
): string {
    const sections = [];

    if (code !== '0x') {
        try {
            const evm = new EVM(code, functionHashes, {});
            const functions = evm
                .getFunctions()
                .map(line => line + '\n')
                .join('');
            sections.push(
                `### Functions\n\n_Functions might not be properly identified_\n\n\`\`\`solidity\n${functions}\`\`\`\n`
            );
        } catch (err: any) {
            console.log(err);
        }
    }

    if (provider.explorerUrl) {
        sections.push(`### Explorer\n\n${provider.addressExplorerUrl(address)!}\n`);
    }

    return sections.join('\n');
}

/**
 * Formats the `report` to a Markdown document.
 *
 * @param report
 * @param contractAddresses
 * @returns the formatted Markdown document.
 */
export function getCashFlowMarkdown(report: CashFlowReport, contractAddresses: Set<string>): string {
    const sections = [];

    sections.push('# Ether Cash Flow Report\n');
    sections.push(`## Total **${formatEther(report.total)}**\n`);
    sections.push(`## Contract Transactions **${report.contractTxsPerc.toFixed(2)} %**\n`);
    sections.push(`## Contract Creation Transactions **${report.contractCreationTxsPerc.toFixed(2)} %**\n`);
    sections.push(`${formatBalances(report.senders, 'Senders')}`);
    sections.push(`${formatBalances(report.receivers, 'Receivers')}`);

    return sections.join('\n');

    /**
     * Formats the given `balances` listing each address, its value,
     * and whether it is an EOA or a Contract address.
     *
     * @param balances to format.
     * @param title the section title.
     * @returns the formatted `balances`.
     */
    function formatBalances(balances: Balances, title: string): string {
        let result = `## ${title}\n\n`;
        for (const [address, value] of Object.entries(balances)) {
            const isContract = contractAddresses.has(address) ? 'Contract' : 'EOA';
            result += `${address} ${isContract}: ${formatEther(value)}\n`;
        }
        return result;
    }
}
