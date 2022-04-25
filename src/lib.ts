import { providers } from "ethers";
import { Fragment, isAddress } from "ethers/lib/utils";

// const FUNC = /^function/;
// const ID = /^\s*(\w+)/;
// const OPEN_PAR = /^\s*(\()/;
// const CLOSE_PAR = /^\s*(\))/;
// const COMMA = /^\s*(,)/;
// const NUMBER = /^\s*(\d+)/;

const regexParen = new RegExp("\\((.*?)\\)");

/**
 * 
 * @param funcSig 
 * @returns 
 * 
 * For more info,
 * see https://docs.ethers.io/v5/api/utils/abi/fragments/#human-readable-abi.
 */
export function parseFunction(funcSig: string): [Fragment, string[]] {
	// let text = funcSig;

	// function next(regex: RegExp) {
	// 	const m = text.match(regex);
	// 	if (m) {
	// 		text = text.substring(m[0].length);
	// 		return m[1];
	// 	}

	// 	return null;
	// }

	// function parse() {
	// 	const name = next(ID);
	// 	next(OPEN_PAR);

	// 	while (!next(CLOSE_PAR)) {
	// 		next(ID);
	// 		next(NUMBER);
	// 		next(COMMA);
	// 	}

	// 	console.log(name);
	// }

	// parse();

	const values = [];
	const m = regexParen.exec(funcSig);
	if (m) {
		const argsMatch = m[1].trim();
		if (argsMatch) {
			const args = argsMatch.split(',');
			const params = [];

			for (let arg of args) {
				arg = arg.trim();
				const pos = arg.indexOf(' ');
				let argType, argValue;
				if (pos === -1) {
					argType = arg;
					argValue = null;
				} else {
					argType = arg.substring(0, pos);
					argValue = arg.substring(pos + 1).trim();
				}

				if (argValue === null) {
					argValue = argType;

					if (isAddress(argValue)) {
						argType = 'address';
					} else if (!Number.isNaN(Number.parseInt(argValue))) {
						argType = 'uint8';
					} else {
						argType = 'string';
					}
				}

				argValue = stripQuote(argValue);
				params.push(argType);
				values.push(argValue);
			}

			funcSig = funcSig.replace(regexParen, `(${params.join(', ')})`);
		}
	}

	if (!funcSig.trim().startsWith('function ')) {
		funcSig = 'function ' + funcSig;
	}

	const fragment = Fragment.from(funcSig);
	return [fragment, values];
}

function stripQuote(value: string): string {
	if ((value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))) {
		return value.substring(1, value.length - 1);
	}

	return value;
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