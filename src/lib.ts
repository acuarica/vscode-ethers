import { Contract, providers, Wallet } from "ethers";
import { Fragment, FunctionFragment } from "ethers/lib/utils";
import { Address, Call, Id } from "./parse";

/**
 * The `EthersMode` represents the mode where the user can 
 * add networks, addresses and contract call to these addresses.
 * 
 * It keeps track of contract calls scopes and addresses aliases.
 * 
 * You can use the `this` symbol to refer to the current address scope.
 */
export class EthersMode {

	/**
	 * Defines the `this` keyword.
	 * This is used to refer to the address of current scope.
	 */
	private static readonly THIS = 'this';

	/**
	 * Symbols table holds the address of each symbol.
	 */
	readonly symbols: { [key: string]: string | undefined } = {};

	/**
	 * Added contract calls, _i.e._, with `call`, are bound to `currentNetwork`.
	 */
	currentNetwork?: string;

	/**
	 * Returns the private key of the current scope, if any.
	 */
	thisPrivateKey?: string;

	/**
	 * Returns the address of the current scope.
	 */
	get thisAddress(): string | undefined {
		return this.symbols[EthersMode.THIS];
	}

	/**
	 * Sets the current network name or JSON-RPC HTTP API URL.
	 * Added contract calls, _i.e._, with `call`, are bound to `currentNetwork`.
	 * 
	 * @param net 
	 * @returns 
	 */
	net(net: string) {
		this.currentNetwork = net;
	}

	/**
	 * Parse an address or private key,
	 * and optionally allows the user to define an alias for it.
	 * 
	 * If the declaration defines a symbol for this address,
	 * adds it to the symbol table.
	 * Finally, adds the `this` current address to the symbol table.
	 * 
	 * @param address 
	 * @returns 
	 */
	address(address: Address) {
		if (address.symbol) {
			if (this.symbols[address.symbol]) {
				throw new Error(`identifier \`${address.symbol}\` already defined`);
			}

			this.symbols[address.symbol] = address.address;
		}
		this.symbols[EthersMode.THIS] = address.address;
		this.thisPrivateKey = address.privateKey;
	}

	/**
	 * 
	 * @param call 
	 * @returns 
	 * 
	 * For more info,
	 * see https://docs.ethers.io/v5/api/utils/abi/fragments/#human-readable-abi.
	 */
	call(call: Call): {

		/**
		 * Resolves call's symbols and
		 * assigns the `thisAddress` and `thisPrivateKey` from the current scope.
		 * It looks up for symbol definitions of both the `contractRef` and `args`.
		 */
		resolve: () => ResolvedCall
	} {
		if (!(call.method as FunctionFragment).constant && !this.thisPrivateKey) {
			throw new Error('sending a transaction requires a signer');
		}

		const values = call.values.map(value => value instanceof Id && value.id === EthersMode.THIS
			? this.symbols[value.id]
			: value);
		const symbols = this.symbols;
		const thisAddress = this.thisAddress;
		const privateKey = this.thisPrivateKey;
		const network = this.currentNetwork;

		return {
			resolve: () => {
				return new class {
					contractRef = call.contractRef ? symbols[call.contractRef.id] : thisAddress;
					func = call.method;
					args = values.map(value => value instanceof Id ? symbols[value.id] : value);
					privateKey = privateKey;
					network = network;

					*getUnresolvedSymbols(): Generator<Id> {
						if (!this.contractRef) {
							yield call.contractRef!;
						}

						for (let i = 0; i < this.args.length; i++) {
							const arg = this.args[i];
							if (arg === undefined) {
								yield call.values[i] as Id;
							}
						}
					}
				};
			}
		};
	}

}

/**
 * 
 */
export interface ResolvedCall {

	/**
	 * 
	 */
	contractRef: string | undefined;

	/**
	 * 
	 */
	func: Fragment;

	/**
	 * 
	 */
	args: (string | undefined)[];

	/**
	 * The signer's private key where this fragment was defined, if any.
	 */
	privateKey?: string;

	/**
	 * The network this call should connect to, if any.
	 */
	network?: string;

	/**
	 * Returns a list of unresolved symbols, _i.e._, symbols that are not defined
	 * in this `EthersMode`. 
	 * If this `ResolvedCall` is fully resolved, and it can be executed,
	 * then this list is empty.
	 */
	getUnresolvedSymbols: () => Generator<Id>;

}

/**
 * 
 * @param call 
 * @returns 
 */
export async function execCall(call: ResolvedCall) {
	const { contractRef, func, args, privateKey, network } = call;

	if (!network) {
		throw new Error("No network provided");
	}

	const provider = createProvider(network!);
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
