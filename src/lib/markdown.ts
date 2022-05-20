import { ModeProvider } from "./provider";

/**
 * 
 * @param provider 
 * @returns 
 */
export function getProviderMarkdown(provider: ModeProvider) {
    const explorerUrl = provider.explorerUrl ? `\n\n#### Explorer\n${provider.explorerUrl}` : '';
    const name = provider.name ? ` \`${provider.name}\`` : '';
    const providerContent = `### Network${name}\n\n#### Connection\n${provider.connectionUrl}${explorerUrl}\n`;
    return providerContent;
}
