// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { LogLevel } from '@ethersproject/logger';
import { Contract, providers, Wallet } from 'ethers';
import { FunctionFragment, Logger } from 'ethers/lib/utils';
import { ExtensionContext, languages, commands, Disposable, window, Hover } from 'vscode';
import { EthersModeCodeLensProvider } from './EthersModeCodelensProvider';
import { createProvider, ResolvedCall } from './lib';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let disposables: Disposable[] = [];

export function activate({ subscriptions }: ExtensionContext) {
    Logger.setLogLevel(LogLevel.OFF);

    window.createOutputChannel('Ethers Mode', 'ethers');
    // const logLevel = workspace.getConfiguration("ethers-mode").get("logLevel");
    // console.log('act', logLevel);
    // if (logLevel) {
    //     Logger.setLogLevel(logLevel as LogLevel);
    // }
    // workspace.onDidChangeConfiguration(e => {
    //     if (e.affectsConfiguration('ethers-mode.logLevel')) {
    //         const logLevel = workspace.getConfiguration("ethers-mode").get("logLevel");
    //         console.log('change', logLevel);
    //         if (logLevel) {
    //             Logger.setLogLevel(logLevel as LogLevel);
    //         }
    //     }
    // });

    const codelensProvider = new EthersModeCodeLensProvider();

    languages.registerCodeLensProvider("ethers", codelensProvider);

    commands.registerCommand("ethers-mode.call", async () => {
        const editor = window.activeTextEditor;
        const document = window.activeTextEditor?.document;

        if (!editor || !document) {
            return;
        }

        for (const codeLens of codelensProvider.codeLenses) {
            if (codeLens.range.contains(editor.selection.active) && codeLens.command && codeLens.command.command === 'ethers-mode.codelens-call') {
                const command = codeLens.command;
                commands.executeCommand(command.command, ...command.arguments!);
                return;
            }
        }
    });

    commands.registerCommand("ethers-mode.codelens-call", async (call: ResolvedCall) => {
        const { contractRef, func, args, privateKey, network } = call;

        const provider = createProvider(network!);

        const isConstant = (func as FunctionFragment).constant;
        let contract;
        if (!isConstant) {
            const signer = new Wallet(privateKey!, provider);
            contract = new Contract(contractRef!, [func], signer);
        } else {
            contract = new Contract(contractRef!, [func], provider);
        }

        // try {
        let show;
        const result = await contract.functions[func.name](...args);
        if (isConstant) {
            show = result;
        } else {
            const receipt = await (result as providers.TransactionResponse).wait();
            show = receipt.transactionHash;
        }

        window.showInformationMessage(`Method call result: ${show}`);
        // } catch (err: any) {
        // console.log(err);
        // console.log(JSON.stringify(err));
        // console.log(err.message);
        // console.log(  'body', JSON.parse( err.error.body).error.message);
        // console.log('msg',err.error.message);

        // }
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
