import { EVM } from 'evm';
import { CancellationToken, Hover, HoverProvider, MarkdownString, Position, ProviderResult, TextDocument } from 'vscode';
import { AddressCodeLens, EthersModeCodeLensProvider, NetworkCodeLens } from './EthersModeCodeLensProvider';
import { createProvider } from '../mode';

export class EthersModeHoverProvider implements HoverProvider {

    constructor(readonly codelensProvider: EthersModeCodeLensProvider) { }

    provideHover(_document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
        for (const codeLens of this.codelensProvider.codeLenses) {
            if (codeLens.range.contains(position)) {
                if (codeLens instanceof NetworkCodeLens) {
                    const provider = createProvider(codeLens.network);
                    const explorerUrl = provider.explorerUrl ? `\n\n#### Explorer\n${provider.explorerUrl}` : '';
                    const netHoverContent = `#### Connection\n${provider.connectionUrl}${explorerUrl}`;
                    return new Hover(netHoverContent);
                } else if (codeLens instanceof AddressCodeLens &&
                    codeLens.code !== undefined &&
                    codeLens.code !== '0x') {

                    let addressHoverContent = ``;
                    try {
                        const evm = new EVM(codeLens.code);
                        addressHoverContent += `\n### Functions\n\n_Functions might not be properly identified_\n\n\`\`\`solidity\n${evm.getFunctions().join('\n')}\n\`\`\``;
                    } catch (err: any) {
                        console.log(err);
                    }

                    const provider = createProvider(codeLens.network);
                    addressHoverContent += provider.explorerUrl ? `\n\n### Explorer\n\n${provider.explorerUrl + codeLens.address}` : '';

                    const contents = new MarkdownString(addressHoverContent);
                    contents.isTrusted = true;

                    if (token.isCancellationRequested) {
                        return;
                    }

                    return new Hover(contents);
                }
            }
        }

        return null;
    }
}
