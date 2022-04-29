import { CancellationToken, CodeLens, CodeLensProvider, Diagnostic, DiagnosticSeverity, languages, Range, TextDocument, workspace } from 'vscode';
import { formatUnits } from 'ethers/lib/utils';
import { createProvider, EthersMode } from './lib';

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

function warn(range: Range, message: string) {
    const diagnostic = new Diagnostic(
        range,
        message,
        DiagnosticSeverity.Warning
    );
    diagnostic.source = 'ethers-mode';
    return diagnostic;
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
        const diagnostics = [];

        const mode = new EthersMode();
        const codeLenses: CodeLens[] = [];
        let currentAddress: string | null = null;
        let currentNetwork: string | null = null;
        let pk;
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const range = line.range;

            if (!line.isEmptyOrWhitespace && !line.text.trimStart().startsWith('#')) {
                const address = mode.address(line.text);
                if (address) {
                    if (address instanceof Error) {
                        diagnostics.push(warn(range, address.message));
                    } else {

                        currentAddress = address.address;
                        pk = address.privateKey;
                        codeLenses.push(new CodeLens(range, {
                            title: 'Address' + (address.isChecksumed ? '' : ` ${address.address}`),
                            command: ''
                        }));

                        if (currentNetwork) {
                            codeLenses.push(new AddressCodeLens(currentNetwork, address.address, range));
                        } else {
                            codeLenses.push(new CodeLens(range, {
                                title: 'No network selected -- first use `net <network>`',
                                command: ''
                            }));
                        }
                    }
                } else if (line.text.trimEnd().startsWith('net ')) {
                    const [_, network] = line.text.split(' ');
                    currentNetwork = network;
                    codeLenses.push(new NetworkCodeLens(network, range));
                } else if (!line.isEmptyOrWhitespace && currentAddress) {
                    const call = mode.call(line.text);
                    if (call instanceof Error) {
                        diagnostics.push(warn(range, call.message));
                    } else {
                        const icon = line.text.includes('payable') ? '$(credit-card)'
                            : line.text.includes('view') ? '$(play)'
                                : '$(flame)';
                        codeLenses.push(new CodeLens(range, {
                            title: `${icon} Call Contract Method`,
                            command: 'ethers-mode.codelens-call',
                            arguments: [currentNetwork, call, pk],
                        }));
                    }
                }
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
