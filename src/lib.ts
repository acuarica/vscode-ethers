import { providers } from "ethers";
import { Fragment, isAddress, ParamType } from "ethers/lib/utils";

/**
 * 
 * @param funcSig 
 * @returns 
 * 
 * For more info,
 * see https://docs.ethers.io/v5/api/utils/abi/fragments/#human-readable-abi.
 */
export function parseFunction(funcSig: string): [Fragment, string[]] {
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

	if (!funcSig.trim().startsWith('function ')) {
		funcSig = 'function ' + funcSig;
	}

	const fragment = Fragment.from(funcSig);
	const inputs = [];
	const values = [];
	for (const input of fragment.inputs) {
		if (input.name) {
			inputs.push(ParamType.fromObject({ ...input as any, name: null, _isParamType: false }));
			values.push(argv[input.name] ?? input.name);
		} else {
			let argType;
			if (isAddress(input.type)) {
				argType = 'address';
			} else {
				const value = Number.parseInt(input.type);
				if (!Number.isNaN(value)) {
					argType = 'uint8';
				} else {
					argType = 'string';
				}
			}
			inputs.push(ParamType.fromObject({ ...input as any, name: null, type: argType, _isParamType: false }));
			values.push(argv[input.type] ?? input.type);
		}
	}

	return [Fragment.fromObject({ ...fragment, inputs, _isFragment: false }), values];
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