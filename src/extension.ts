// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { LogLevel } from '@ethersproject/logger';
import { providers, utils } from 'ethers';
import { FunctionFragment, Logger } from 'ethers/lib/utils';
import { EVM } from 'evm';
import {
    commands,
    Disposable,
    ExtensionContext,
    languages,
    ProgressLocation,
    TextEditor,
    TextEditorEdit,
    Uri,
    ViewColumn,
    window,
    workspace,
} from 'vscode';
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
export function activate({ subscriptions, extensionUri }: ExtensionContext): void {
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
        register(
            commands.registerCommand(command, function (...args: unknown[]): any {
                output.append(`[${command}] `);
                return callback(...args);
            })
        );
    }

    /**
     * Wrapper around `registerTextEditorCommand` that pushes the resulting `Disposable`
     * into the `context`'s `subscriptions`.
     */
    function registerTextEditorCommand(
        command: string,
        callback: (textEditor: TextEditor, edit: TextEditorEdit, ...args: any[]) => void
    ) {
        register(
            commands.registerTextEditorCommand(
                command,
                function (textEditor: TextEditor, edit: TextEditorEdit, ...args: unknown[]) {
                    output.append(`[${command}] `);
                    callback(textEditor, edit, ...args);
                }
            )
        );
    }

    const output = window.createOutputChannel('Ethers Mode');

    Logger.setLogLevel(LogLevel.DEBUG);
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

    register(languages.registerCodeLensProvider('ethers', codelensProvider));

    const functionHashesUri = Uri.joinPath(extensionUri, 'data', 'functionHashes.min.json');
    output.appendLine(`Load function hashes ${functionHashesUri.toString()}`);
    workspace.fs.readFile(functionHashesUri).then(
        buffer => {
            const jsonText = new TextDecoder('utf-8').decode(buffer);
            const functionHashes = JSON.parse(jsonText) as { [hash: string]: string };

            register(
                languages.registerHoverProvider('ethers', new EthersModeHoverProvider(codelensProvider, functionHashes))
            );
            register(
                languages.registerCodeActionsProvider(
                    'ethers',
                    new EthersModeCodeActionProvider(codelensProvider, functionHashes)
                )
            );

            registerCommand('ethers-mode.decompile', async (address: string, code: string) => {
                output.appendLine(`Address ${address}`);

                const evm = new EVM(code, functionHashes, {});
                let text = `// Decompiled bytecode from address \`${address}\`\n\n`;
                text += evm.decompile();
                await workspace.openTextDocument({ language: 'solidity', content: text });
            });
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        r => output.appendLine(r.toString())
    );

    registerTextEditorCommand('ethers-mode.call', (textEditor: TextEditor) => {
        for (const codeLens of codelensProvider.codeLenses) {
            if (
                codeLens.range.contains(textEditor.selection.active) &&
                codeLens.command &&
                codeLens.command.command === 'ethers-mode.codelens-call'
            ) {
                output.appendLine('Found Code Lens command to execute...');
                const command = codeLens.command;
                void commands.executeCommand(command.command, ...(command.arguments as unknown[])!);
                return;
            }
        }

        output.appendLine('No code lens to run found in the active selection');
    });

    registerCommand('ethers-mode.codelens-cashflow', async (currentNetwork: string, blockRange: BlockRange) => {
        const provider = createProvider(currentNetwork);

        const progressOptions = (title: string) => {
            return {
                location: ProgressLocation.Notification,
                title,
                cancellable: true,
            };
        };

        const transactions = await window.withProgress(
            progressOptions('Fetching transactions for block'),
            (progress, token) => {
                token.onCancellationRequested(() => {
                    output.appendLine('User canceled fetching blocks');
                });

                progress.report({ increment: 0 });

                const getBlock = (blockNumber: number) => {
                    progress.report({ increment: 2, message: `#${blockNumber}...` });
                    return provider.getBlockWithTransactions(blockNumber);
                };

                return fetchTransactions(provider, getBlock, blockRange);
            }
        );

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
        await window.showTextDocument(doc, ViewColumn.Beside);
    });

    registerCommand('ethers-mode.codelens-call', async (call: ResolvedCall) => {
        const { func, network } = call;

        output.appendLine(`Execute \`${func.format(utils.FormatTypes['full'])}\` on \u{1F310} ${network!}`);

        // try {
        let show: unknown;
        const result = await execCall(call);
        if ((func as FunctionFragment).constant) {
            show = result;
        } else {
            const receipt = await (result as providers.TransactionResponse).wait();
            show = receipt.transactionHash.toString();
        }

        await window.showInformationMessage(`Method call result: ${show as any}`);
        // } catch (err: any) {
        // console.log(err);
        // console.log(JSON.stringify(err));
        // console.log(err.message);
        // console.log(  'body', JSON.parse( err.error.body).error.message);
        // console.log('msg',err.error.message);

        // }
    });
}
