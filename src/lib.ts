import { providers } from "ethers";
import { Fragment, FunctionFragment } from "ethers/lib/utils";
import { Address, Call, Id } from "./parse";

/**
 * 
 */
export interface CallResolver {

	/**
	 * 
	 */
	call: Call,

	/**
	 * 
	 */
	resolve: () => {

		/**
		 * 
		 */
		contractRef: string;

		/**
		 * 
		 */
		func: Fragment;

		/**
		 * 
		 */
		args: string[];

		/**
		 * The signer's private key where this fragment was defined, if any.
		 */
		privateKey?: string;

		/**
		 * The network this call should connect to, if any.
		 */
		network?: string;

	}
}

/**
 * 
 */
export class EthersMode {

	/**
	 * Defines the `this` keyword.
	 * This is used to refer to the address of current scope.
	 */
	public static readonly THIS = 'this';

	/**
	 * Symbols table holds the address of each symbol.
	 */
	public readonly symbols: { [key: string]: string } = {};

	/**
	 * 
	 */
	public currentNetwork?: string;

	/**
	 * Returns the address of the current scope.
	 */
	public get thisAddress(): string | undefined {
		return this.symbols[EthersMode.THIS];
	}

	/**
	 * Returns the private key of the current scope, if any.
	 */
	public thisPrivateKey?: string;

	/**
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
	call(call: Call): CallResolver {
		const values: (string | Id)[] = [];
		for (const value of call.values) {
			if (value instanceof Id && value.id === EthersMode.THIS) {
				values.push(this.symbols[value.id]);
			} else {
				values.push(value);
			}
		}

		let thisAddress = this.symbols[EthersMode.THIS];
		const privateKey = this.thisPrivateKey;
		const network = this.currentNetwork;

		if (!(call.method as FunctionFragment).constant && !privateKey) {
			throw new Error('sending a transaction requires a signer');
		}

		return {
			call,
			resolve: () => {
				const { method, contractRef } = call;

				if (contractRef) {
					thisAddress = this.symbols[contractRef.id];
				}
				const args = values.map(value => value instanceof Id ? this.symbols[value.id] : value);

				return {
					contractRef: thisAddress,
					func: method,
					args,
					privateKey,
					network,
				};
			}
		};
	}
}

/**
 * 
 * @param call 
 */
export function* getUnresolvedSymbols(call: CallResolver): Generator<string> {
	const { contractRef, args } = call.resolve();
	if (!contractRef) {
		yield call.call.contractRef!.id;
	}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === null) {
			yield (call.call.values[i] as Id).id;
		}
	}
}

/**
 * 
 * @param network 
 * @returns 
 */
export function createProvider(network: string): providers.Provider {
	if (network.includes(':')) {
		return new providers.JsonRpcProvider(network);
	}

	switch (network) {
		case 'fuji':
			return new providers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
		default:
			return new providers.EtherscanProvider(network);
	}
}