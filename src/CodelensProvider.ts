import * as vscode from 'vscode';

import { ethers } from "ethers";

/**
 * CodelensProvider
 */
export class CodelensProvider implements vscode.CodeLensProvider {

    private codeLenses: vscode.CodeLens[] = [];
    private regex: RegExp;
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        this.regex = /(.+)/g;

        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {

        if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
            this.codeLenses = [];
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
                    if (line.text.startsWith('function') && currentAddress) {
                        this.codeLenses.push(new vscode.CodeLens(range, {
                            title: 'call method',
                            command: 'codelens-sample.codelensAction',
                            arguments: [currentAddress, line.text],
                        }));
                    } else if (line.text.toUpperCase().startsWith('RPC')) {
                        const [_, url] = line.text.split(' ');
                        currentProviderUrl = url;
                        console.log(currentProviderUrl);
                    } else {
                        if (ethers.utils.isAddress(line.text)) {
                            currentAddress = line.text;
                            this.codeLenses.push(new vscode.CodeLens(range, {
                                title: 'Contract',
                                command: 'codelens-sample.codelensAction',
                                arguments: [line.text],
                            }));
                        }
                    }
                }
            }
            return this.codeLenses;
        }
        return [];
    }

    // public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
    //     if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
    //         codeLens.command = {
    //             title: "Codelens provided by sample extension",
    //             tooltip: "Tooltip provided by sample extension",
    //             command: "codelens-sample.codelensAction",
    //             arguments: ["Argument 1", codeLens.range.]
    //         };
    //         return codeLens;
    //     }
    //     return null;
    // }
}

