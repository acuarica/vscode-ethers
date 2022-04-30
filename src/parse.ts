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
	contractRef?: Id;

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
	inferredPositions: (number | null)[];
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
		return { kind: 'address', value };
	} else if ((value = parseCall(line))) {
		return { kind: 'call', value };
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
export function parseAddress(line: string): Address | null {
	const m = line.match(ADDRESS);
	if (m) {
		let address: string;
		let privateKey: string | undefined;
		if (m[1].length >= 64) {
			privateKey = m[1].length === 64 ? '0x' + m[1] : m[1];
			try {
				address = ethers.utils.computeAddress(privateKey as string);
			} catch (err: any) {
				throw new Error('Invalid private key');
			}
		} else {
			address = ethers.utils.getAddress(m[1]);
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
 * Internally this function uses
 * [`Fragment`](https://docs.ethers.io/v5/api/utils/abi/fragments/#Fragment)`.from`
 * to parse a method signature.
 * 
 * @param line 
 * @returns 
 */
export function parseCall(line: string): Call {
	const patch = patchFragmentSignature(line)!;
	// eslint-disable-next-line prefer-const
	let [patchedFuncSig, argv, pos] = patch;

	const m = line.match(CONTRACT_REF);
	let contractRef;
	if (m) {
		patchedFuncSig = patchedFuncSig.replace(CONTRACT_REF, '');
		contractRef = new Id(m[1]);
	}

	const fragment = Fragment.from(!patchedFuncSig.trim().startsWith('function ')
		? 'function ' + patchedFuncSig
		: patchedFuncSig);

	const inputs = [];
	const values = [];
	const inferredPositions = [];
	for (const input of fragment.inputs) {
		let type = null, value: string | Id | null = null;
		if (input.name) {
			type = input.type;
			value = input.name;
			if (value.startsWith('$$')) {
				value = argv[value];
			}
			inferredPositions.push(null);
		} else if (input.type) {
			value = input.type;
			if (value.startsWith('$$')) {
				type = 'string';
				value = argv[value];
			} else {
				type = inferArgumentType(value);
			}

			inferredPositions.push(pos[0]);
		} else {
			throw new Error('parsing error: invalid argument');
		}
		pos.shift();

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
		inferredPositions,
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
 * This method performs an initial parsing of the fragment signature.
 * It patches the string arguments in a fragment signature, inside the first parenthesis group, and
 * keeps track of the argument's positions.
 * Returns the method signature,
 * a map of arguments to their string values and
 * an array of argument's positions.
 * 
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
 * @returns The patched signature, the map of argument replacements and the argument's positions
 */
export function patchFragmentSignature(fragmentSig: string): [string, Record<string, string>, number[]] {
	let openQuote = null;
	const remaining = fragmentSig.length;
	let strn = null;
	const strs: { [key: string]: string } = {};
	const positions = [];
	for (let i = 0; i < remaining; i++) {
		if (!openQuote && fragmentSig[i] === '(') {
			if (strn !== null) {
				throw new Error('parsing error: nesting parenthesis not allowed');
			}

			strn = 0;
			positions.push(i);
		} else if (!openQuote && fragmentSig[i] === ')') {
			break;
		} else if (!openQuote && fragmentSig[i] === ',') {
			strn!++;
			positions.push(i);
		} else if (fragmentSig[i] === '"' && (i === 0 || fragmentSig[i - 1] !== '\\')) {
			if (openQuote === null) {
				openQuote = i;
			} else {
				if (strn === null) {
					throw new Error('parsing error: found comma outside parenthesis group');
				}
				strs['$$arg' + strn] = fragmentSig.substring(openQuote + 1, i);
				const name = `$$arg${strn}`;
				fragmentSig = `${fragmentSig.substring(0, openQuote)}${name}${fragmentSig.substring(i + 1, fragmentSig.length)}`;
				i = openQuote + name.length - 1;
				openQuote = null;
			}
		}
	}

	if (openQuote !== null) {
		throw new Error('parsing error: unterminated string literal');
	}

	return [fragmentSig, strs, positions];
}
