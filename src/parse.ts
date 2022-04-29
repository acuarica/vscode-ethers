import { ethers } from "ethers";
import { Fragment, isAddress, ParamType } from "ethers/lib/utils";

const NET = /^net\s+(\S+)\s*$/;
const ID = /[A-Za-z_]\w*/;
const ETH = /(?:0x)?[0-9a-fA-F]{40}/;
const PK = /(?:0x)?[0-9a-fA-F]{64}/;
const ICAP = /XE[0-9]{2}[0-9A-Za-z]{30,31}/;
const ADDRESS = new RegExp(`^(${ETH.source}|${ICAP.source}|${PK.source})(?:\\s+as\\s+(${ID.source}))?$`);
const CONTRACT_REF = new RegExp(`^(?:\\s*function\\s)?\\s*(${ID.source})\\.`);

/**
 * 
 */
export type ParseResult =
	{
		kind: 'net',
		value: string,
	} |
	{
		kind: 'address',
		value: Address,
	} |
	{
		kind: 'call',
		value: Call,
	} |
	{
		kind: 'error',
		value: Error,
	};


/**
 * 
 */
export interface Address {

	/**
	 * 
	 */
	address: string;

	/**
	 * 
	 */
	isChecksumed: boolean;

	/**
	 * 
	 */
	privateKey?: string;

	/**
	 * 
	 */
	symbol?: string;

}

/**
 * Represents a smart contract call.
 */
export interface Call {

	/**
	 * 
	 */
	method: Fragment;

	/**
	 * 
	 */
	values: (string | Id)[];

	/**
	 * 
	 */
	contractRef?: Id;
}

/**
 * Represents a reference to a symbol.
 * An address can have be referenced using the `as` keyword.
 * For example,
 * 
 * ```ethers
 * net localhost
 * 
 * 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 as account
 * ```
 */
export class Id {

	/**
	 * 
	 * @param id 
	 */
	constructor(public readonly id: string) { }

}

/**
 * 
 * @param line 
 * @returns 
 */
export function parse(line: string): ParseResult | null {
	if (line.trim().length === 0 || line.trimStart().startsWith('#')) {
		return null;
	}

	let value;
	if ((value = parseNet(line))) {
		return { kind: 'net', value };
	} else if ((value = parseAddress(line))) {
		return value instanceof Error ? { kind: 'error', value } : { kind: 'address', value };
	} else if ((value = parseCall(line))) {
		return value instanceof Error ? { kind: 'error', value } : { kind: 'call', value };
	}

	return null;
}

/**
 * 
 * @param line 
 * @returns 
 */
export function parseNet(line: string): string | null {
	const match = line.match(NET);
	if (match) {
		const network = match[1];
		return network;
	}

	return null;
}


/**
 * Parse an address or private key,
 * and optionally allows the user to define an alias for it.
 * Addresses are parsed using https://docs.ethers.io/v5/api/utils/address/#utils-getAddress,
 * while private keys are parsed using https://docs.ethers.io/v5/api/utils/address/#utils-computeAddress.
 * 
 * @param line 
 * @returns 
 */
export function parseAddress(line: string): Address | Error | null {
	const m = line.match(ADDRESS);
	if (m) {
		let address: string;
		let privateKey: string | undefined;
		if (m[1].length >= 64) {
			privateKey = m[1].length === 64 ? '0x' + m[1] : m[1];
			try {
				address = ethers.utils.computeAddress(privateKey as string);
			} catch (err: any) {
				return new Error('Invalid private key');
			}
		} else {
			try {
				address = ethers.utils.getAddress(m[1]);
			} catch (err: any) {
				return err;
			}
		}
		const symbol = m[2];
		return { address, isChecksumed: address === m[1], privateKey, symbol };
	}

	return null;
}


/**
 * 
 * For more info,
 * see https://docs.ethers.io/v5/api/utils/abi/fragments/#human-readable-abi.
 * 
 * @param line 
 * @returns 
 */
export function parseCall(line: string): Call | Error | null {
	const m = line.match(CONTRACT_REF);
	let contractRef;
	if (m) {
		line = line.replace(CONTRACT_REF, '');
		contractRef = new Id(m[1]);
	}

	if (!line.trim().startsWith('function ')) {
		line = 'function ' + line;
	}

	const patch = patchFragmentSignature(line)!;
	if (patch instanceof Error) {
		return patch;
	}

	const [patchedFuncSig, argv] = patch;
	let fragment: Fragment;
	try {
		fragment = Fragment.from(patchedFuncSig);
	} catch (err: any) {
		return err;
	}

	const inputs = [];
	const values = [];
	for (const input of fragment.inputs) {
		let type = null, value: string | Id | null = null;
		if (input.name) {
			type = input.type;
			value = input.name;
			if (value.startsWith('$$')) {
				value = argv[value];
			}
		} else {
			value = input.type;
			if (value.startsWith('$$')) {
				type = 'string';
				value = argv[value];
			} else {
				type = inferArgumentType(value);
			}
		}

		if (!type) {
			type = 'address';
			value = new Id(value);
		}

		inputs.push(ParamType.fromObject({ ...input as any, name: null, type, _isParamType: false }));
		values.push(value);
	}

	return {
		method: Fragment.fromObject({ ...fragment, inputs, _isFragment: false }),
		values,
		contractRef,
	};
}

/**
 * Number arguments with underscore are accepted.
 * 
 * @param value 
 */
export function inferArgumentType(value: string): string | null {
	if (isAddress(value)) {
		return 'address';
	}

	const isDigit = (c: string) => c >= '0' && c <= '9';

	if (value.length > 0 && isDigit(value[0]) && !value.endsWith('_')) {
		const num = Number.parseInt(value.replace('_', ''));
		if (Number.isInteger(num)) {
			if (num < 255) {
				return 'uint8';
			} else {
				return 'uint256';
			}
		}
	}

	return null;
}

/**
 * Patches the string arguments in a fragment signature.
 * Returns the method signature and a map of arguments to their string values.
 * For example:
 * 
 * ```js
 * expect(patchFragmentSignature('method(string "hola mundo")'))
 *	   .to.be.deep.equal([
 *	    	'method(string  $$arg0)',
 *		    {
 *		    	'$$arg0': 'hola mundo'
 *	    	}]
 *	   );
 * ```
 * 
 * This is in order to parse the fragment signature using `Fragment` from `ethers`.
 * 
 * @param fragmentSig The fragment signature to patch
 * @returns The patched signature and the map of argument replacements
 */
export function patchFragmentSignature(fragmentSig: string): [string, Record<string, string>] | Error {
	let openQuote = null;
	const remaining = fragmentSig.length;
	let strn = null;
	const strs: { [key: string]: string } = {};
	for (let i = 0; i < remaining; i++) {
		if (!openQuote && fragmentSig[i] === '(') {
			strn = 0;
		} else if (!openQuote && fragmentSig[i] === ')') {
			strn = null;
		} else if (!openQuote && fragmentSig[i] === ',') {
			strn!++;
		} else if (fragmentSig[i] === '"' && i > 0 && fragmentSig[i - 1] !== '\\') {
			if (!openQuote) {
				openQuote = i;
			} else {
				strs['$$arg' + strn] = fragmentSig.substring(openQuote + 1, i);
				const name = `$$arg${strn}`;
				fragmentSig = `${fragmentSig.substring(0, openQuote)}${name}${fragmentSig.substring(i + 1, fragmentSig.length)}`;
				i = openQuote + name.length - 1;
				openQuote = null;
			}
		}
	}

	if (openQuote) {
		return new Error('parsing error: unterminated string literal');
	}

	return [fragmentSig, strs];
}
