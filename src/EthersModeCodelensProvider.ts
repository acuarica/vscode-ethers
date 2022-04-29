import { CancellationToken, CodeLens, CodeLensProvider, Diagnostic, DiagnosticSeverity, languages, Range, TextDocument, workspace } from 'vscode';
import { formatUnits } from 'ethers/lib/utils';
import { CallResolver, createProvider, EthersMode } from './lib';
import { Id, parse } from './parse';

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

        const mode = new EthersMode();
        const codeLenses: CodeLens[] = [];
        const callCodeLenses = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const range = line.range;
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
                const call = mode.call(result.value);
                const icon = line.text.includes('payable') ? '$(credit-card)'
                    : line.text.includes('view') ? '$(play)'
                        : '$(flame)';
                callCodeLenses.push(new CodeLens(range, {
                    title: `${icon} Call Contract Method`,
                    command: 'ethers-mode.codelens-call',
                    arguments: [call],
                }));
            } else {
                error(range, result.value.message);
            }
        }

        for (const ccl of callCodeLenses) {
            const call = ccl.command!.arguments![1] as CallResolver;
            const { contractRef, args } = call.resolve();
            let pushIt = true;
            if (!contractRef) {
                error(ccl.range, `symbol \`${call.call.contractRef?.id}\` not defined`);
                pushIt = false;
            }

            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (!arg) {
                    error(ccl.range, `symbol \`${(call.call.values[i] as Id).id}\` not defined`);
                    pushIt = false;
                }
            }

            if (pushIt) {
                codeLenses.push(ccl);
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
