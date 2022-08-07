// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { LogLevel } from '@ethersproject/logger';
import { providers, utils } from 'ethers';
import { FunctionFragment, Logger } from 'ethers/lib/utils';
import { EVM } from 'evm';
import { commands, Disposable, ExtensionContext, languages, ProgressLocation, ViewColumn, window, workspace } from 'vscode';
import { cashFlow, fetchTransactions, isContract } from './lib/cashflow';
import { getCashFlowMarkdown } from './lib/markdown';
import { ResolvedCall } from './lib/mode';
import { BlockRange } from './lib/parse';
import { createProvider, execCall } from './lib/provider';
import { EthersModeCodeActionProvider } from './providers/EthersModeCodeActionProvider';
import { EthersModeCodeLensProvider } from './providers/EthersModeCodeLensProvider';
import { EthersModeHoverProvider } from './providers/EthersModeHoverProvider';

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed
 * 
 * See https://code.visualstudio.com/api/get-started/extension-anatomy#extension-entry-file.
 * 
 * @param context 
 */
export function activate({ subscriptions }: ExtensionContext) {

    /**
     * See `subscriptions` property in https://code.visualstudio.com/api/references/vscode-api#ExtensionContext.
     */
    function register(disposable: Disposable) {
        subscriptions.push(disposable);
    }

    /**
     * Wrapper around `registerCommand` that pushes the resulting `Disposable`
     * into the `context`'s `subscriptions`.
     */
    function registerCommand(command: string, callback: (...args: any[]) => any) {
        register(commands.registerCommand(command, callback));
    }

    // const registerCommandTextEditor = (command: string, callback: (textEditor: TextEditor, edit: TextEditorEdit, ...args: any[]) => void) => subscriptions.push(commands.registerTextEditorCommand(command, callback));

    Logger.setLogLevel(LogLevel.DEBUG);

    const output = window.createOutputChannel('Ethers Mode');
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

    register(languages.registerCodeLensProvider("ethers", codelensProvider));
    register(languages.registerCodeActionsProvider("ethers", new EthersModeCodeActionProvider(codelensProvider)));
    register(languages.registerHoverProvider("ethers", new EthersModeHoverProvider(codelensProvider)));

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

    registerCommand("ethers-mode.codelens-cashflow", async (currentNetwork: string, blockRange: BlockRange) => {
        const provider = createProvider(currentNetwork);

        const progressOptions = (title: string) => {
            return {
                location: ProgressLocation.Notification,
                title,
                cancellable: true,
            };
        };

        const transactions = await window.withProgress(progressOptions('Fetching transactions for block'), (progress, token) => {
            token.onCancellationRequested(() => {
                output.appendLine('User canceled fetching blocks');
            });

            progress.report({ increment: 0 });

            const getBlock = (blockNumber: number) => {
                progress.report({ increment: 2, message: `#${blockNumber}...` });
                return provider.getBlockWithTransactions(blockNumber);
            };

            return fetchTransactions(provider, getBlock, blockRange);
        });

        const report = cashFlow(transactions);

        const contractAddresses = new Set<string>();
        await window.withProgress(progressOptions('Fetching info for address'), async (progress, token) => {
            token.onCancellationRequested(() => {
                output.appendLine('User canceled fetching address info');
            });

            for (const address of new Set([...Object.keys(report.senders), ...Object.keys(report.receivers)])) {
                progress.report({ increment: 2, message: `${address}...` });
                if (await isContract(provider, address)) {
                    contractAddresses.add(address);
                }
            }
        });

        const content = getCashFlowMarkdown(report, contractAddresses);
        const doc = await workspace.openTextDocument({ language: 'markdown', content });
        window.showTextDocument(doc, ViewColumn.Beside);
    });

    registerCommand("ethers-mode.codelens-call", async (call: ResolvedCall) => {
        const { func, network } = call;

        output.appendLine(`Execute \`${func.format(utils.FormatTypes.full)}\` on \u{1F310} ${network}`);

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
