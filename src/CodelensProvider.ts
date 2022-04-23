import * as vscode from 'vscode';

import { ethers } from "ethers";
import { CancellationToken, CodeLens, CodeLensProvider, EventEmitter, TextDocument } from 'vscode';
import { formatUnits } from 'ethers/lib/utils';

/**
 * CodelensProvider
 */
export class CodelensProvider implements CodeLensProvider {

    private regex: RegExp;
    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        this.regex = /(.+)/g;

        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
        if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
            const codeLenses: CodeLens[] = [];
            const regex = new RegExp(this.regex);
            const text = document.getText();
            let matches;
            let currentAddress: string | null = null;
            let currentProviderUrl: string | null = null;
            while ((matches = regex.exec(text)) !== null) {
                const line = document.lineAt(document.positionAt(matches.index).line);
                const indexOf = line.text.indexOf(matches[0]);
                const position = new vscode.Position(line.lineNumber, indexOf);
                const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));

                if (range) {
                    if (ethers.utils.isAddress(line.text)) {
                        currentAddress = line.text;
                        codeLenses.push(new CodeLens(range, {
                            title: 'Address',
                            command: ''
                        }));

                        (range as any).text = currentAddress;
                        codeLenses.push(new CodeLens(range));
                    } else if (!line.isEmptyOrWhitespace && currentAddress) {
                        const icon = line.text.includes('payable') ? '$(credit-card)'
                            : line.text.includes('view') ? '$(play)'
                                : '$(flame)';
                        codeLenses.push(new CodeLens(range, {
                            title: `${icon} Call Smart Contract Method`,
                            command: 'ethers-mode.callMethod',
                            arguments: [currentAddress, line.text],
                        }));
                    } else if (line.text.toUpperCase().startsWith('RPC')) {
                        const [_, url] = line.text.split(' ');
                        currentProviderUrl = url;
                        console.log(currentProviderUrl);
                    }
                }
            }
            return codeLenses;
        }

        return [];
    }

    public async resolveCodeLens(codeLens: vscode.CodeLens, _token: vscode.CancellationToken) {
        if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
            const provider = new ethers.providers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
            const addr = (codeLens.range as any).text;
            const code = await provider.getCode(addr);
            const value = await provider.getBalance(addr);
            codeLens.command = {
                title: (code === '0x' ? '$(account) EOA' : '$(file-code) Contract') + ' -- Balance: ' + formatUnits(value),
                command: "codelens-sample.codelensAction"
            };

            return codeLens;
        }

        return null;
    }
}
