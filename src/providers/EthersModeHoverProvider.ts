import {
    CancellationToken,
    Hover,
    HoverProvider,
    MarkdownString,
    Position,
    ProviderResult,
    TextDocument,
} from 'vscode';
import { getAddressMarkdown, getBlockMarkdown, getProviderMarkdown } from '../lib/markdown';
import { createProvider } from '../lib/provider';
import {
    AddressCodeLens,
    BlockCodeLens,
    EthersModeCodeLensProvider,
    NetworkCodeLens,
} from './EthersModeCodeLensProvider';

/**
 * This `HoverProvider` complements the following already displayed `CodeLens`es

 * - `NetworkCodeLens`
 * - `BlockCodeLens`
 * - `CodeCodeLens`
 * 
 * If it founds one of these `CodeLens`es and
 * they have fetched their additional data,
 * it will display a `Hover` with this additional data.
 */
export class EthersModeHoverProvider implements HoverProvider {
    constructor(
        /**
         * The `CodeLensProvider` where to look for the `CodeLens`es.
         */
        private readonly codelensProvider: EthersModeCodeLensProvider
    ) {}

    provideHover(_document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
        for (const codeLens of this.codelensProvider.codeLenses) {
            if (codeLens.range.contains(position)) {
                if (codeLens instanceof NetworkCodeLens) {
                    return new Hover(getProviderMarkdown(createProvider(codeLens.network)));
                } else if (codeLens instanceof BlockCodeLens && codeLens.block !== undefined) {
                    const provider = createProvider(codeLens.network);
                    return new Hover(getBlockMarkdown(provider, codeLens.block));
                } else if (codeLens instanceof AddressCodeLens && codeLens.code !== undefined) {
                    const provider = createProvider(codeLens.network);
                    const contents = new MarkdownString(getAddressMarkdown(provider, codeLens.address, codeLens.code));
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
