import { CancellationToken, CodeLens, CodeLensProvider, Event, EventEmitter, Position, Range, TextDocument, workspace } from 'vscode';
import { formatUnits } from 'ethers/lib/utils';
import { createProvider, Parse } from './lib';

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
export class CodelensProvider implements CodeLensProvider {

    private regex: RegExp;
    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        this.regex = /(.+)/g;

        workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

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
        if (workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
            const parse = new Parse();
            const codeLenses: CodeLens[] = [];
            const regex = new RegExp(this.regex);
            const text = document.getText();
            let matches;
            let currentAddress: string | null = null;
            let currentNetwork: string | null = null;
            let pk;
            while ((matches = regex.exec(text)) !== null) {
                const line = document.lineAt(document.positionAt(matches.index).line);
                const indexOf = line.text.indexOf(matches[0]);
                const position = new Position(line.lineNumber, indexOf);
                const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));

                if (range) {
                    const address = parse.address(line.text);
                    if (address) {
                        currentAddress = address[0];
                        pk = address[2];
                        codeLenses.push(new CodeLens(range, {
                            title: 'Address' + (address[1] ? `${address[0]}` : ''),
                            command: ''
                        }));

                        if (currentNetwork) {
                            codeLenses.push(new AddressCodeLens(currentNetwork, currentAddress, range));
                        } else {
                            codeLenses.push(new CodeLens(range, {
                                title: 'No network selected -- first use `net <network>`',
                                command: ''
                            }));
                        }
                    } else if (line.text.trimEnd().startsWith('net ')) {
                        const [_, network] = line.text.split(' ');
                        currentNetwork = network;
                        codeLenses.push(new NetworkCodeLens(network, range));
                    } else if (!line.isEmptyOrWhitespace && currentAddress) {
                        const icon = line.text.includes('payable') ? '$(credit-card)'
                            : line.text.includes('view') ? '$(play)'
                                : '$(flame)';
                        codeLenses.push(new CodeLens(range, {
                            title: `${icon} Call Smart Contract Method`,
                            command: 'ethers-mode.callMethod',
                            arguments: [currentNetwork, currentAddress, line.text, parse, pk],
                        }));
                    }
                }
            }
            return codeLenses;
        }

        return [];
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
                    codeLens.command = {
                        title: (code === '0x' ? '$(account) EOA' : '$(file-code) Contract') + ' -- Balance: ' + formatUnits(value),
                        command: "codelens-sample.codelensAction"
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
