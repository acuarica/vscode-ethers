import * as vscode from 'vscode';

import { ethers } from "ethers";
import { CancellationToken, CodeLens, CodeLensProvider, EventEmitter, Range, TextDocument } from 'vscode';
import { formatUnits } from 'ethers/lib/utils';
import { createProvider } from './lib';

/**
 * 
 */
class NetworkCodeLens extends CodeLens {
    constructor(readonly network: string, range: Range) {
        super(range);
    }
}

/**
 * 
 */
class AddressCodeLens extends CodeLens {
    constructor(readonly network: string, readonly address: string, range: Range) {
        super(range);
    }
}

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

    public provideCodeLenses(document: TextDocument, _token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
        if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
            const codeLenses: CodeLens[] = [];
            const regex = new RegExp(this.regex);
            const text = document.getText();
            let matches;
            let currentAddress: string | null = null;
            let currentNetwork: string | null = null;
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

                        if (currentNetwork) {
                            codeLenses.push(new AddressCodeLens(currentNetwork, currentAddress, range));
                        } else {
                            codeLenses.push(new CodeLens(range, {
                                title: 'No network selected -- use `net <network>`',
                                command: ''
                            }));
                        }
                    } else if (line.text.trim().startsWith('net')) {
                        const [_, network] = line.text.split(' ');
                        currentNetwork = network;
                        codeLenses.push(new NetworkCodeLens(network, range));
                    } else if (!line.isEmptyOrWhitespace && currentAddress) {
                        const icon = line.text.includes('payable') ? '$(credit-card)'
                            : line.text.includes('view') ? '$(play)'
                                : '$(flame)';
                        codeLenses.push(new CodeLens(range, {
                            title: `${icon} Call Smart Contract Method`,
                            command: 'ethers-mode.callMethod',
                            arguments: [currentNetwork, currentAddress, line.text],
                        }));
                    }
                }
            }
            return codeLenses;
        }

        return [];
    }

    public async resolveCodeLens(codeLens: CodeLens, _token: CancellationToken) {
        if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
            if (codeLens instanceof NetworkCodeLens) {
                const provider = createProvider(codeLens.network);
                const network = await provider.getNetwork();
                codeLens.command = {
                    title: `$(server-environment) Chain ID ${network.chainId}`,
                    command: '',
                };
            } else if (codeLens instanceof AddressCodeLens) {
                const provider = createProvider(codeLens.network);
                const code = await provider.getCode(codeLens.address);
                const value = await provider.getBalance(codeLens.address);
                codeLens.command = {
                    title: (code === '0x' ? '$(account) EOA' : '$(file-code) Contract') + ' -- Balance: ' + formatUnits(value),
                    command: "codelens-sample.codelensAction"
                };
            }
            return codeLens;
        }

        return null;
    }
}
