import { EVM } from 'evm';
import {
    CancellationToken,
    CodeAction,
    CodeActionContext,
    CodeActionKind,
    CodeActionProvider,
    Command,
    ProviderResult,
    Range,
    Selection,
    TextDocument,
    WorkspaceEdit,
} from 'vscode';
import { AddressCodeLens, EthersModeCodeLensProvider } from './EthersModeCodeLensProvider';

export class EthersModeCodeActionProvider implements CodeActionProvider {
    constructor(readonly codelensProvider: EthersModeCodeLensProvider) {}

    provideCodeActions(
        document: TextDocument,
        range: Range | Selection,
        _context: CodeActionContext,
        _token: CancellationToken
    ): ProviderResult<(CodeAction | Command)[]> {
        for (const codeLens of this.codelensProvider.codeLenses) {
            if (codeLens.range.contains(range.start)) {
                if (codeLens instanceof AddressCodeLens && codeLens.code !== undefined && codeLens.code !== '0x') {
                    try {
                        const evm = new EVM(codeLens.code);
                        const functions =
                            evm
                                .getFunctions()
                                .map(f => `    ${f} view `)
                                .join('\n') + '\n';

                        const codeAction = new CodeAction('Insert Contract Functions', CodeActionKind.Empty);
                        codeAction.edit = new WorkspaceEdit();
                        codeAction.edit.insert(
                            document.uri,
                            range.start.translate(1, -range.start.character),
                            functions
                        );

                        return [codeAction];
                    } catch (err) {
                        console.log(err);
                        return null;
                    }
                }
            }
        }

        return null;
    }
}
