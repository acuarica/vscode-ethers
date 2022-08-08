import { Contract, providers, Wallet } from 'ethers';
import { FunctionFragment } from 'ethers/lib/utils';
import { ResolvedCall } from './mode';

/**
 *
 * @param call
 * @param createProviderFn
 * @returns
 */
export async function execCall(
    call: ResolvedCall,
    createProviderFn: (network: string) => providers.Provider = createProvider
): Promise<unknown> {
    const { contractRef, func, args, privateKey, network } = call;

    if (!network) {
        throw new Error('No network provided');
    }

    const provider = createProviderFn(network);
    const contract = new Contract(
        contractRef!,
        [func],
        (func as FunctionFragment).constant ? provider : new Wallet(privateKey!, provider)
    );

    return contract.functions[func.name]!(...args);
}

/**
 * Given a `network` name or RPC URL,
 * creates an Ethers network provider.
 *
 * @param network
 * @returns
 */
export function createProvider(network: string): providers.Provider & ModeProvider {
    if (network.includes(':')) {
        return new JsonRpcModeProvider('', network, undefined);
    }

    switch (network) {
        case 'fuji':
            return new JsonRpcModeProvider(
                'fuji',
                'https://api.avax-test.network/ext/bc/C/rpc',
                'https://testnet.snowtrace.io'
            );
        default:
            return new EtherscanModeProvider(network);
    }
}

export interface ModeProvider<T extends string | undefined = string | undefined> {
    name: string;
    connectionUrl: string;
    explorerUrl: T;

    blockExplorerUrl(blockNumber: number): T extends string ? string : null;

    addressExplorerUrl(address: string): T extends string ? string : null;
}

class JsonRpcModeProvider extends providers.JsonRpcProvider implements ModeProvider<string | undefined> {
    constructor(readonly name: string, readonly connectionUrl: string, readonly explorerUrl: string | undefined) {
        super(connectionUrl);
    }

    blockExplorerUrl(blockNumber: number): string | null {
        return this.explorerUrl ? `${this.explorerUrl}/block/${blockNumber}` : null;
    }

    addressExplorerUrl(address: string): string | null {
        return this.explorerUrl ? `${this.explorerUrl}/address/${address}` : null;
    }
}

class EtherscanModeProvider extends providers.EtherscanProvider implements ModeProvider<string> {
    constructor(readonly net: string) {
        super(net);
    }

    get name(): string {
        return this.net;
    }

    get connectionUrl(): string {
        return this.getBaseUrl();
    }

    get explorerUrl(): string {
        const domain = ['homestead', 'mainnet'].includes(this.net) ? '' : `${this.net}.`;
        return `https://${domain}etherscan.io`;
    }

    blockExplorerUrl(blockNumber: number): string {
        return `${this.explorerUrl}/block/${blockNumber}`;
    }

    addressExplorerUrl(address: string): string {
        return `${this.explorerUrl}/address/${address}`;
    }
}
