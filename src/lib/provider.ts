import { Contract, providers, Wallet } from "ethers";
import { FunctionFragment } from "ethers/lib/utils";
import { ResolvedCall } from "./mode";

/**
 * 
 * @param call 
 * @param createProviderFn
 * @returns 
 */
export async function execCall(call: ResolvedCall, createProviderFn: (network: string) => providers.Provider = createProvider) {
    const { contractRef, func, args, privateKey, network } = call;

    if (!network) {
        throw new Error("No network provided");
    }

    const provider = createProviderFn(network!);
    const contract = new Contract(contractRef!, [func], (func as FunctionFragment).constant
        ? provider
        : new Wallet(privateKey!, provider));

    return await contract.functions[func.name](...args);
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
        return new JsonRpcModeProvider('', network);
    }

    switch (network) {
        case 'fuji':
            return new JsonRpcModeProvider('fuji', 'https://api.avax-test.network/ext/bc/C/rpc', 'https://testnet.snowtrace.io');
        default:
            return new EtherscanModeProvider(network);
    }
}

export interface ModeProvider {
    name: string;
    connectionUrl: string;
    explorerUrl?: string;

    addressExplorerUrl(address: string): string;

    blockExplorerUrl(blockNumber: number): string;
}

class JsonRpcModeProvider extends providers.JsonRpcProvider implements ModeProvider {

    constructor(readonly name: string, readonly connectionUrl: string, readonly explorerUrl?: string) {
        super(connectionUrl);
    }

    addressExplorerUrl(address: string): string {
        return `${this.explorerUrl}/address/${address}`;
    }

    blockExplorerUrl(blockNumber: number): string {
        return `${this.explorerUrl}/block/${blockNumber}`;
    }
}

class EtherscanModeProvider extends providers.EtherscanProvider implements ModeProvider {

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

    addressExplorerUrl(address: string): string {
        return `${this.explorerUrl}/address/${address}`;
    }

    blockExplorerUrl(blockNumber: number): string {
        return `${this.explorerUrl}/block/${blockNumber}`;
    }

}
