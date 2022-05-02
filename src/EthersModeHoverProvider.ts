import { EVM } from 'evm';
import { CancellationToken, Hover, HoverProvider, MarkdownString, Position, ProviderResult, TextDocument } from 'vscode';
import { AddressCodeLens, EthersModeCodeLensProvider, NetworkCodeLens } from './EthersModeCodelensProvider';
import { createProvider } from './lib';

export class EthersModeHoverProvider implements HoverProvider {

    constructor(readonly codelensProvider: EthersModeCodeLensProvider) { }

    provideHover(_document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
        for (const codeLens of this.codelensProvider.codeLenses) {
            if (codeLens.range.contains(position)) {
                if (codeLens instanceof AddressCodeLens &&
                    codeLens.code !== undefined &&
                    codeLens.code !== '0x') {

                    let addressHoverContent = ``;
                    try {
                        const evm = new EVM(codeLens.code);
                        addressHoverContent += `\n### Functions\n\n_View functions are not properly identified_\n\n\`\`\`solidity\n${evm.getFunctions().join('\n')}\n\`\`\``;
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
                } else if (codeLens instanceof NetworkCodeLens) {
                    const provider = createProvider(codeLens.network);
                    const netHoverContent = `### Connection Info\n${provider.connectionUrl}`;
                    return new Hover(netHoverContent);
                }
            }
        }

        return null;
    }
}
