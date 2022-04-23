// import { FunctionFragment } from "ethers/lib/utils";

const regexParen = new RegExp('\\((.*?)\\)');

export function parseFunction(line: string) {
	const m = line.match(regexParen);
	console.log(m);
	return m![1];
	// const a = FunctionFragment.fromString(line);
	// return 1;
}
