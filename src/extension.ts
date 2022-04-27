// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Contract, Wallet } from 'ethers';
import { FunctionFragment } from 'ethers/lib/utils';
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

    commands.registerCommand("ethers-mode.callMethod", async (network: string, contractAddress: string, funcSig: any, parse: Parse, pk: any) => {
        const [func, args, self] = parse.call(funcSig);

        if (self) {
            contractAddress = parse.symbols[self];
        }

        const provider = createProvider(network);

        let contract;
        if (!(func as FunctionFragment).constant) {
            const signer = new Wallet(pk, provider);
            contract = new Contract(contractAddress, [func], signer);
        } else {
            contract = new Contract(contractAddress, [func], provider);
        }

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


    // const collection = languages.createDiagnosticCollection('ethers-mode');
    // subscriptions.push(window.onDidChangeActiveTextEditor(
    //     (e: TextEditor | undefined) => {
    //         if (e !== undefined) {
    //             const d: Diagnostic = new Diagnostic(
    //                 new Range(
    //                     new Position(3, 8), new Position(3, 9),
    //                 ),
    //                 'Repeated assignment of loop variables',
    //                 DiagnosticSeverity.Warning,
    //             );
    //             d.source = 'ethers-mode';

    //             collection.set(e.document.uri, [d]);
    //         }
    //     }));


}

// this method is called when your extension is deactivated
export function deactivate() {
    if (disposables) {
        disposables.forEach(item => item.dispose());
    }
    disposables = [];
}
