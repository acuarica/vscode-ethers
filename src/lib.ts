import { Fragment, isAddress } from "ethers/lib/utils";

const regexParen = new RegExp("\\((.*?)\\)");

export function parseFunction(funcSig: string): [Fragment, string[]] {
	funcSig = 'function ' + funcSig;
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

				if ((argValue.startsWith('"') && argValue.endsWith('"')) ||
					(argValue.startsWith("'") && argValue.endsWith("'"))) {
					argValue = argValue.substring(1, argValue.length - 1);
				}
				params.push(argType);
				values.push(argValue);
			}

			funcSig = funcSig.replace(regexParen, `(${params.join(', ')})`);
		}
	}

	const func = Fragment.from(funcSig);
	return [func, values];
}
