import { providers } from "ethers";
import { Fragment } from "ethers/lib/utils";
import { Address, Id, parseAddress, parseCall } from "./parse";

/**
 * 
 */
export interface CallResolver {

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
	}
}

/**
 * 
 */
export class EthersMode {

	/**
	 * 
	 */
	public static readonly THIS = 'this';

	/**
	 * 
	 */
	public readonly symbols: { [key: string]: string } = {};

	public currentPrivateKey: string | null = null;

	/**
	 * Parse an address or private key,
	 * and optionally allows the user to define an alias for it.
	 * 
	 * If the declaration defines a symbol for this address,
	 * adds it to the symbol table.
	 * Finally, adds the `this` current address to the symbol table.
	 * 
	 * @param line 
	 * @returns 
	 */
	address(line: string): Address | Error | null {
		const address = parseAddress(line);
		if (!address || address instanceof Error) {
			return address;
		}

		if (address.symbol) {
			this.symbols[address.symbol] = address.address;
		}
		this.symbols[EthersMode.THIS] = address.address;
		return address;
	}

	/**
	 * 
	 * @param line 
	 * @returns 
	 * 
	 * For more info,
	 * see https://docs.ethers.io/v5/api/utils/abi/fragments/#human-readable-abi.
	 */
	call(line: string): CallResolver | Error | null {
		const call = parseCall(line);
		if (!call || call instanceof Error) {
			return call;
		}

		const values: (string | Id)[] = [];
		for (const value of call.values) {
			if (value instanceof Id && value.id === EthersMode.THIS) {
				values.push(this.symbols[value.id]);
			} else {
				values.push(value);
			}
		}

		let thisAddress = this.symbols[EthersMode.THIS];

		return {
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
				};
			}
		};
	}
}

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