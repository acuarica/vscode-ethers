import { CancellationToken, Hover, HoverProvider, MarkdownString, Position, ProviderResult, TextDocument } from 'vscode';
import { AddressCodeLens, BlockCodeLens, EthersModeCodeLensProvider, NetworkCodeLens } from './EthersModeCodeLensProvider';
import { createProvider } from '../lib/provider';
import { getBlockMarkdown, getCodeMarkdown, getProviderMarkdown } from '../lib/markdown';

export class EthersModeHoverProvider implements HoverProvider {

    constructor(readonly codelensProvider: EthersModeCodeLensProvider) { }

    provideHover(_document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
        for (const codeLens of this.codelensProvider.codeLenses) {
            if (codeLens.range.contains(position)) {
                if (codeLens instanceof NetworkCodeLens) {
                    return new Hover(getProviderMarkdown(createProvider(codeLens.network)));
                } else if (codeLens instanceof BlockCodeLens && codeLens.block !== undefined) {
                    return new Hover(getBlockMarkdown(codeLens.block));
                } else if (codeLens instanceof AddressCodeLens && codeLens.code !== undefined && codeLens.code !== '0x') {
                    const provider = createProvider(codeLens.network);
                    const contents = new MarkdownString(getCodeMarkdown(provider, codeLens.address, codeLens.code));
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
