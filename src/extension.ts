// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Contract } from 'ethers';
import { ExtensionContext, languages, commands, Disposable, workspace, window, Hover } from 'vscode';
import { CodelensProvider } from './CodelensProvider';
import { createProvider, Parse } from './lib';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let disposables: Disposable[] = [];

export function activate({ subscriptions }: ExtensionContext) {
    const codelensProvider = new CodelensProvider();

    languages.registerCodeLensProvider("*", codelensProvider);

    commands.registerCommand("codelens-sample.enableCodeLens", () => {
        workspace.getConfiguration("codelens-sample").update("enableCodeLens", true, true);
    });

    commands.registerCommand("codelens-sample.disableCodeLens", () => {
        workspace.getConfiguration("codelens-sample").update("enableCodeLens", false, true);
    });

    commands.registerCommand("ethers-mode.callMethod", async (network: string, contractAddress: string, funcSig: any, parse: Parse) => {
        const [func, args] = parse.func(funcSig);

        const provider = createProvider(network);
        const contract = new Contract(contractAddress, [func], provider);
        const result = await contract.functions[func.name](...args);

        window.showInformationMessage(`CodeLens action clicked with args=${result}`);
    });

    languages.registerHoverProvider('*', {
        provideHover(document, position, _token) {

            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);

            if (word == "HELLO") {

                return new Hover({
                    language: "Hello language",
                    value: "Hello Value"
                });
            }
        }
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (disposables) {
        disposables.forEach(item => item.dispose());
    }
    disposables = [];
}
