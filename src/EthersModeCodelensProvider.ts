import { CancellationToken, CodeLens, CodeLensProvider, DecorationInstanceRenderOptions, DecorationOptions, Diagnostic, DiagnosticSeverity, languages, Position, Range, TextDocument, TextLine, ThemeColor, window, workspace } from 'vscode';
import { formatUnits, FunctionFragment } from 'ethers/lib/utils';
import { createProvider, EthersMode } from './lib';
import { Call, parse } from './parse';

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
        const diagnostics: Diagnostic[] = [];
        function error(range: Range, message: string) {
            const diagnostic = new Diagnostic(
                range,
                message,
                DiagnosticSeverity.Error
            );
            diagnostic.source = 'ethers-mode';
            diagnostics.push(diagnostic);
        }

        const languageFunctions: DecorationOptions[] = [];

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
                    codeLenses.push(new NetworkCodeLens(mode.currentNetwork!, range));
                } else if (result.kind === 'address') {
                    mode.address(result.value);
                    codeLenses.push(new CodeLens(range, {
                        title: 'Address' + (result.value.isChecksumed ? '' : ` ${result.value.address}`),
                        command: ''
                    }));

                    if (mode.currentNetwork) {
                        codeLenses.push(new AddressCodeLens(mode.currentNetwork, result.value.address, range));
                    } else {
                        codeLenses.push(new CodeLens(range, {
                            title: 'No network selected -- first use `net <network>`',
                            command: ''
                        }));
                    }
                } else if (result.kind === 'call') {
                    decor(languageFunctions, result.value, line);
                    const call = mode.call(result.value);
                    calls.push({ call, range });
                }
            } catch (err: any) {
                error(range, err.message);
            }
        }

        window.activeTextEditor?.setDecorations(hintDecorationType, languageFunctions);

        for (const { call, range } of calls) {
            let pushIt = true;
            const resolvedCall = call.resolve();
            for (const id of resolvedCall.getUnresolvedSymbols()) {
                error(range, `symbol \`${id}\` not defined`);
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
     * @param _token 
     * @returns 
     * 
     * For more info,
     * see https://code.visualstudio.com/api/references/vscode-api#CodeLensProvider.resolveCodeLens.
     */
    public async resolveCodeLens(codeLens: CodeLens, _token: CancellationToken): Promise<CodeLens | null> {
        if (workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
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
            } else if (codeLens instanceof AddressCodeLens) {
                try {
                    const provider = createProvider(codeLens.network);
                    const code = await provider.getCode(codeLens.address);
                    const value = await provider.getBalance(codeLens.address);
                    codeLens.command = {
                        title: (code === '0x' ? '$(account) EOA' : '$(file-code) Contract') + ' -- Balance: ' + formatUnits(value),
                        command: '',
                    };
                } catch (_err) {
                    codeLens.command = {
                        title: 'No network',
                        command: '',
                    };
                }
            }
            return codeLens;
        }

        return null;
    }
}


const hintDecorationType = window.createTextEditorDecorationType({});

function decor(languageFunctions: DecorationOptions[], call: Call, line: TextLine) {

    for (let i = 0; i < call.inferredPositions.length; i++) {
        const p = call.inferredPositions[i];
        if (p !== null) {
            const text = ' ' + call.method.inputs[i].type + ' '.repeat(1);
            const pos = new Position(line.lineNumber, p + 1);
            const range = new Range(pos, pos);
            const annotation = Annotations.parameterAnnotation(
                text,
                range,
            );

            languageFunctions.push(annotation);
        }
    }

}

export class Annotations {
    public static parameterAnnotation(
        message: string,
        range: Range
    ): DecorationOptions {
        return {
            range,
            renderOptions: {
                after: {
                    contentText: message,
                    color: new ThemeColor("editorInlayHint.typeForeground"),
                    // backgroundColor: new ThemeColor("inlineparameters.annotationBackground"),
                    backgroundColor: new ThemeColor("editorInlayHint.typeBackground"),


                    // fontStyle: workspace.getConfiguration("inline-parameters").get("fontStyle", 'bold'),
                    // fontWeight: workspace.getConfiguration("inline-parameters").get("fontWeight", '18'),
                    border: 'blue',
                    textDecoration: `;
                        font-size: ${workspace.getConfiguration("inline-parameters").get("fontSize", 16)};
                        margin: 10;
                        padding: ${workspace.getConfiguration("inline-parameters").get("padding", 20)};
                        border-radius: ${workspace.getConfiguration("inline-parameters").get("borderRadius", '15')};
                        border: ${workspace.getConfiguration("inline-parameters").get("border", 2)};
                    `,
                },
            } as DecorationInstanceRenderOptions,
        } as DecorationOptions;
    }
}