import { ModeProvider } from "./provider";
import { Block } from "@ethersproject/abstract-provider";

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
