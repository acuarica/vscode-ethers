import { ModeProvider } from "./provider";
import { Block } from "@ethersproject/abstract-provider";
import { EVM } from "evm";
import { Balances, CashFlowReport } from "./cashflow";
import { formatEther } from "ethers/lib/utils";

/**
 * 
 * @param provider 
 * @returns 
 */
export function getProviderMarkdown(provider: ModeProvider) {
    const explorerUrl = provider.explorerUrl ? `\n\n#### Explorer\n${provider.explorerUrl}` : '';
    const name = provider.name ? ` \`${provider.name}\`` : '';
    const content = `### Network${name}\n\n#### Connection\n${provider.connectionUrl}${explorerUrl}\n`;
    return content;
}

/**
 * 
 * @param block 
 * @returns 
 */
export function getBlockMarkdown(block: Pick<Block, 'number' | 'hash' | 'timestamp'>) {
    const timestamp = new Date(block.timestamp * 1000).toUTCString();
    const content = `### Block ${block.number}\n\n- Block Hash: \`${block.hash}\`\n- Timestamp: ${timestamp}\n`;
    return content;
}

/**
 * 
 * @param provider 
 * @param address 
 * @param code 
 * @returns 
 */
export function getCodeMarkdown(provider: ModeProvider, address: string, code: string | Buffer) {
    let content = '';
    try {
        const evm = new EVM(code);
        const functions = evm.getFunctions().map(line => line + '\n').join('');
        content += `### Functions\n\n_Functions might not be properly identified_\n\n\`\`\`solidity\n${functions}\`\`\`\n`;
    } catch (err: any) {
        console.log(err);
    }

    content += provider.explorerUrl ? `\n### Explorer\n\n${provider.explorerUrl + address}\n` : '';

    return content;
}

/**
 * Formats the `report` to a Markdown document.
 * 
 * @param report 
 * @param contractAddresses 
 * @returns the formatted Markdown document.
 */
export function getCashFlowMarkdown(report: CashFlowReport, contractAddresses: Set<string>) {
    function formatBalances(balances: Balances, title: string) {
        let result = `## ${title}\n\n`;
        for (const [address, value] of Object.entries(balances)) {
            const isContract = contractAddresses.has(address) ? 'Contract' : 'EOA';
            result += `${address} ${isContract}: ${formatEther(value)}\n`;
        }
        return result;
    }

    const content = `# Ether Cash Flow Report\n\n## Total **${formatEther(report.total)}**\n\n${formatBalances(report.senders, 'Senders')}\n${formatBalances(report.receivers, 'Receivers')}`;
    return content;
}
