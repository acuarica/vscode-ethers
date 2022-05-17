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
 * 
 * @param network 
 * @returns 
 */
export function createProvider(network: string): providers.Provider & ModeProvider {
    if (network.includes(':')) {
        return new JsonRpcModeProvider(network);
    }

    switch (network) {
        case 'fuji':
            return new JsonRpcModeProvider('https://api.avax-test.network/ext/bc/C/rpc', 'https://testnet.snowtrace.io/address/');
        default:
            return new EtherscanModeProvider(network);
    }
}

interface ModeProvider {
    connectionUrl: string;
    explorerUrl?: string;
}

class EtherscanModeProvider extends providers.EtherscanProvider implements ModeProvider {

    constructor(readonly net: string) {
        super(net);
    }

    get connectionUrl(): string {
        return this.getBaseUrl();
    }

    get explorerUrl(): string {
        const domain = this.net === 'homestead' ? '' : `${this.net}.`;
        return `https://${domain}etherscan.io/address/`;
    }

}

class JsonRpcModeProvider extends providers.JsonRpcProvider implements ModeProvider {

    constructor(readonly connectionUrl: string, readonly explorerUrl?: string) {
        super(connectionUrl);
    }

}