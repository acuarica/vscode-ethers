import { Block } from "@ethersproject/abstract-provider";
import { formatUnits, FunctionFragment } from 'ethers/lib/utils';
import { CancellationToken, CodeLens, CodeLensProvider, DecorationOptions, Diagnostic, DiagnosticSeverity, languages, Position, Range, TextDocument, TextLine, ThemeColor, window, workspace } from 'vscode';
import { createProvider, EthersMode } from '../lib/mode';
import { BlockRange, Call, parse } from '../lib/parse';

/**
 * 
 */
export class NetworkCodeLens extends CodeLens {
    constructor(readonly network: string, range: Range) {
        super(range);
    }
}

/**
 * 
 */
export class AddressCodeLens extends CodeLens {

    code?: string;

    constructor(readonly network: string, readonly address: string, range: Range) {
        super(range);
    }
}

/**
 * 
 */
export class BlockCodeLens extends CodeLens {

    block?: Block;

    constructor(readonly network: string, readonly blockRange: BlockRange, range: Range) {
        super(range);
    }
}

/**
 * CodelensProvider.
 * 
 * See https://code.visualstudio.com/api/references/vscode-api#CodeLensProvider
 */
export class EthersModeCodeLensProvider implements CodeLensProvider {

    public codeLenses: CodeLens[] = [];

    private readonly _collection = languages.createDiagnosticCollection('ethers-mode');

    /**
     * 
     * @param document 
     * @param _token 
     * @returns 
     * 
     * For more info,
     * see https://code.visualstudio.com/api/references/vscode-api#CodeLensProvider.provideCodeLenses.
     */
    public provideCodeLenses(document: TextDocument, _token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
        const shouldDisplayNetworkInfo = (workspace.getConfiguration("ethers-mode").get("shouldDisplayNetworkInfo", true));
        const shouldDisplayAddressInfo = (workspace.getConfiguration("ethers-mode").get("shouldDisplayAddressInfo", true));

        const diagnostics: Diagnostic[] = [];
        function warn(range: Range, message: string) {
            const diagnostic = new Diagnostic(
                range,
                message,
                DiagnosticSeverity.Warning
            );
            diagnostic.source = 'ethers-mode';
            diagnostics.push(diagnostic);
        }

        const inferredTypeDecorations: DecorationOptions[] = [];

        const mode = new EthersMode();
        const codeLenses: CodeLens[] = [];
        const calls = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const range = line.range;
            try {
                const result = parse(line.text);
                if (!result) {
                    continue;
                }

                if (result.kind === 'net') {
                    mode.net(result.value);
                    if (shouldDisplayNetworkInfo) {
                        codeLenses.push(new NetworkCodeLens(mode.currentNetwork!, range));
                    }
                } else if (result.kind === 'block') {
                    if (mode.currentNetwork) {
                        codeLenses.push(new BlockCodeLens(mode.currentNetwork, result.value, range));
                        codeLenses.push(new CodeLens(range, {
                            title: 'See Ether Cash Flow',
                            command: 'ethers-mode.codelens-cashflow',
                            arguments: [mode.currentNetwork, result.value],
                        }));
                    } else {
                        codeLenses.push(new CodeLens(range, {
                            title: 'No network selected -- first use `net <network>`',
                            command: ''
                        }));
                    }
                } else if (result.kind === 'address') {
                    mode.address(result.value);
                    codeLenses.push(new CodeLens(range, {
                        title: 'Address' + (result.value.isChecksumed ? '' : ` ${result.value.address}`),
                        command: ''
                    }));

                    if (mode.currentNetwork) {
                        if (shouldDisplayAddressInfo) {
                            codeLenses.push(new AddressCodeLens(mode.currentNetwork, result.value.address, range));
                        }
                    } else {
                        codeLenses.push(new CodeLens(range, {
                            title: 'No network selected -- first use `net <network>`',
                            command: ''
                        }));
                    }
                } else if (result.kind === 'call') {
                    decorate(inferredTypeDecorations, result.value, line);
                    const call = mode.call(result.value);
                    calls.push({ call, range });
                }
            } catch (err: any) {
                warn(range, err.message);
            }
        }

        window.activeTextEditor?.setDecorations(inferredTypeDecorationType, inferredTypeDecorations);

        for (const { call, range } of calls) {
            let pushIt = true;
            const resolvedCall = call.resolve();
            for (const id of resolvedCall.getUnresolvedSymbols()) {
                const line = range.start.line;
                const symbolRange = new Range(new Position(line, id.col), new Position(line, id.col + id.id.length));
                warn(symbolRange, `symbol \`${id.id}\` not defined`);
                pushIt = false;
            }

            if (pushIt) {
                const mut = (resolvedCall.func as FunctionFragment).stateMutability;
                const icon = mut === 'payable' ? '$(credit-card)'
                    : mut === 'view' ? '$(play)'
                        : '$(flame)';
                codeLenses.push(new CodeLens(range, {
                    title: `${icon} Call Contract Method`,
                    command: 'ethers-mode.codelens-call',
                    arguments: [resolvedCall],
                }));
            }
        }

        this._collection.set(document.uri, diagnostics);
        this.codeLenses = codeLenses;
        return codeLenses;
    }

    /**
     * 
     * @param codeLens 
     * @param token 
     * @returns 
     * 
     * For more info,
     * see https://code.visualstudio.com/api/references/vscode-api#CodeLensProvider.resolveCodeLens.
     */
    public async resolveCodeLens(codeLens: CodeLens, token: CancellationToken): Promise<CodeLens | null> {
        if (codeLens instanceof NetworkCodeLens) {
            try {
                const provider = createProvider(codeLens.network);
                const network = await provider.getNetwork();
                const blockNumber = await provider.getBlockNumber();
                const gasPrice = await provider.getGasPrice();
                codeLens.command = {
                    title: `$(server-environment) Chain ID ${network.chainId} -- Block # ${blockNumber} | Gas Price ${formatUnits(gasPrice)}`,
                    command: '',
                };
            } catch (err: any) {
                console.debug(err.message);
                codeLens.command = {
                    title: `No network: ${err.message}`,
                    command: '',
                };
            }
        } else if (codeLens instanceof BlockCodeLens) {
            try {
                const provider = createProvider(codeLens.network);
                codeLens.block = await provider.getBlock(codeLens.blockRange.from);
                codeLens.command = {
                    title: '$(symbol-function) Block',
                    command: '',
                };
            } catch (_err) {
                codeLens.command = {
                    title: 'No network',
                    command: '',
                };
            }
        } else if (codeLens instanceof AddressCodeLens) {
            try {
                const provider = createProvider(codeLens.network);
                const code = await provider.getCode(codeLens.address);
                const value = await provider.getBalance(codeLens.address);
                const [title, command, args, tooltip] = code === '0x'
                    ? ['$(account) EOA', '', [], '']
                    : ['$(file-code) Decompile Contract', 'ethers-mode.decompile', [code], 'Package evm, https://github.com/MrLuit/evm, performs contract decompilation, which has some issues https://github.com/MrLuit/evm/issues.'];
                codeLens.code = code;
                codeLens.command = {
                    title: title + ' -- Balance: ' + formatUnits(value),
                    command,
                    arguments: args,
                    tooltip,
                };
            } catch (_err) {
                codeLens.command = {
                    title: 'No network',
                    command: '',
                };
            }
        }

        if (token.isCancellationRequested) {
            return null;
        }

        return codeLens;
    }
}


const inferredTypeDecorationType = window.createTextEditorDecorationType({
    after: {
        color: new ThemeColor("editorInlayHint.typeForeground"),
        backgroundColor: new ThemeColor("editorInlayHint.typeBackground"),
        textDecoration: `;
                        margin-left: 4px;
                        margin-right: 6px;
                        padding: 4px;
                        border-radius: 4px;
                    `,
    }
});

function decorate(inferredTypeDecorations: DecorationOptions[], call: Call, line: TextLine) {
    for (let i = 0; i < call.inferredPositions.length; i++) {
        const p = call.inferredPositions[i];
        if (p !== null) {
            const pos = new Position(line.lineNumber, p + 1);
            inferredTypeDecorations.push({
                range: new Range(pos, pos),
                renderOptions: {
                    after: {
                        contentText: call.method.inputs[i].type,
                    },
                },
            });
        }
    }
}
