import { ethers, providers } from "ethers";
import { Fragment, isAddress, ParamType } from "ethers/lib/utils";

const ID = /[A-Za-z_]\w*/;
const ETH = /(?:0x)?[0-9a-fA-F]{40}/;
const ICAP = /XE[0-9]{2}[0-9A-Za-z]{30,31}/;
const ADDRESS = new RegExp(`^(${ETH.source}|${ICAP.source})(?:\\s+as\\s+(${ID.source}))?$`);

/**
 * 
 */
export class Parse {

	/**
	 * 
	 */
	public readonly symbols: { [key: string]: string } = {};

	/**
	 * 
	 * For more info, see https://docs.ethers.io/v5/api/utils/address/#utils-getAddress.
	 * 
	 * @param line 
	 * @returns 
	 */
	address(line: string): string | null {
		const m = line.match(ADDRESS);
		if (m) {
			try {
				const address = ethers.utils.getAddress(m[1]);
				if (m[2]) {
					this.symbols[m[2]] = address;
				}
				return address;
			} catch (_err) {
				return null;
			}
		}

		return null;
	}

	/**
	 * 
	 * @param sig 
	 * @returns 
	 * 
	 * For more info,
	 * see https://docs.ethers.io/v5/api/utils/abi/fragments/#human-readable-abi.
	 */
	func(sig: string): [Fragment, string[]] {
		if (!sig.trim().startsWith('function ')) {
			sig = 'function ' + sig;
		}

		const [patchedFuncSig, argv] = patchSig(sig);

		const fragment = Fragment.from(patchedFuncSig);
		const inputs = [];
		const values = [];
		for (const input of fragment.inputs) {
			if (input.name) {
				inputs.push(ParamType.fromObject({ ...input as any, name: null, _isParamType: false }));

				const value = this.symbols[input.name] ?? input.name;
				values.push(argv[value] ?? value);
			} else {
				const value = this.symbols[input.type] ?? input.type;
				let argType;
				if (isAddress(value)) {
					argType = 'address';
				} else {
					const num = Number.parseInt(value);
					if (!Number.isNaN(num)) {
						argType = 'uint8';
					} else {
						argType = 'string';
					}
				}
				inputs.push(ParamType.fromObject({ ...input as any, name: null, type: argType, _isParamType: false }));
				values.push(argv[value] ?? value);
			}
		}

		return [Fragment.fromObject({ ...fragment, inputs, _isFragment: false }), values];
	}

}

export function patchSig(funcSig: string): [string, Record<string, string>] {
	let openQuote = null;
	const remaining = funcSig.length;
	let argn = null;
	const argv: { [key: string]: string } = {};
	for (let i = 0; i < remaining; i++) {
		if (!openQuote && funcSig[i] === '(') {
			argn = 0;
		} else if (!openQuote && funcSig[i] === ')') {
			argn = null;
		} else if (!openQuote && funcSig[i] === ',') {
			argn!++;
		} else if (funcSig[i] === '"' && i > 0 && funcSig[i - 1] !== '\\') {
			if (!openQuote) {
				openQuote = i;
			} else {
				argv['$arg' + argn] = funcSig.substring(openQuote + 1, i);
				const name = `$arg${argn}`;
				funcSig = `${funcSig.substring(0, openQuote)}${name}${funcSig.substring(i + 1, funcSig.length)}`;
				i = openQuote + name.length - 1;
				openQuote = null;
			}
		}
	}
	return [funcSig, argv];
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