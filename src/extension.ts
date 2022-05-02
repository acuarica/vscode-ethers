// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { LogLevel } from '@ethersproject/logger';
import { providers, utils } from 'ethers';
import { FunctionFragment, Logger } from 'ethers/lib/utils';
import { EVM } from 'evm';
import { ExtensionContext, languages, commands, Disposable, window, workspace } from 'vscode';
import { EthersModeCodeActionProvider } from './EthersModeCodeActionProvider';
import { EthersModeCodeLensProvider } from './EthersModeCodelensProvider';
import { EthersModeHoverProvider } from './EthersModeHoverProvider';
import { execCall, ResolvedCall } from './lib';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let disposables: Disposable[] = [];

export function activate({ subscriptions }: ExtensionContext) {
    const registerCommand = (command: string, callback: (...args: any[]) => any) => subscriptions.push(commands.registerCommand(command, callback));
    // const registerCommandTextEditor = (command: string, callback: (textEditor: TextEditor, edit: TextEditorEdit, ...args: any[]) => void) => subscriptions.push(commands.registerTextEditorCommand(command, callback));

    Logger.setLogLevel(LogLevel.DEBUG);

    const log = window.createOutputChannel('Ethers Mode');
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
    languages.registerCodeActionsProvider("ethers", new EthersModeCodeActionProvider(codelensProvider));
    languages.registerHoverProvider("ethers", new EthersModeHoverProvider(codelensProvider));

    registerCommand("ethers-mode.call", async () => {
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

    registerCommand("ethers-mode.codelens-call", async (call: ResolvedCall) => {
        const { func, network } = call;

        log.appendLine(`Execute \`${func.format(utils.FormatTypes.full)}\` on \u{1F310} ${network}`);

        // try {
        let show;
        const result = await execCall(call);
        if ((func as FunctionFragment).constant) {
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

    registerCommand('ethers-mode.decompile', async (code: string) => {
        const evm = new EVM(code);
        const text = evm.decompile();
        await workspace.openTextDocument({ language: 'solidity', content: text });
    });

}

// this method is called when your extension is deactivated
export function deactivate() {
    if (disposables) {
        disposables.forEach(item => item.dispose());
    }
    disposables = [];
}
