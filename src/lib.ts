import { providers } from "ethers";
import { Fragment, isAddress } from "ethers/lib/utils";

const regexParen = new RegExp("\\((.*?)\\)");

export function parseFunction(funcSig: string): [Fragment, string[]] {
	if (!funcSig.trim().startsWith('function ')) {
		funcSig = 'function ' + funcSig;
	}

	const m = regexParen.exec(funcSig);

	const values = [];

	if (m) {
		const argsMatch = m[1].trim();
		if (argsMatch) {
			const args = argsMatch.split(',');
			const params = [];

			for (const arg of args) {
				let [argType, argValue] = arg.trim().split(' ');

				if (argValue === undefined) {
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

	const func = Fragment.from(funcSig);
	return [func, values];
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