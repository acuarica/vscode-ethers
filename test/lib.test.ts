import { expect } from "chai";
import { Fragment } from "ethers/lib/utils";
import { parseFunction } from "../src/lib";

describe("parseFunction", () => {

	it("should parse an argless function", () => {
		expect(parseFunction('method() view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method() view returns (uint256)'), []]);
		expect(parseFunction('  method (  ) view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method() view returns (uint256)'), []]);
	});

	it("should accept `function` keyword", () => {
		expect(parseFunction('function method() view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method() view returns (uint256)'), []]);
		expect(parseFunction('  function method (  ) view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method() view returns (uint256)'), []]);
	});

	it("should parse function with basic types", () => {
		expect(parseFunction('method(uint8 1) view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method(uint8) view returns (uint256)'), ['1']]);
		expect(parseFunction('method( uint8  1  ) view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method(uint8) view returns (uint256)'), ['1']]);
		expect(parseFunction('method( uint8  1   ,  string  "hola"   ) view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method(uint8, string) view returns (uint256)'), ['1', 'hola']]);
		expect(parseFunction('method( uint8  2   ,  string  " hola, mundo", string "hello"   ) view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method(uint8, string, string) view returns (uint256)'), ['2', ' hola, mundo', 'hello']]);
	});

	it("should parse `string` arguments properly", () => {
		expect(parseFunction('  method   ( string "hola(mundo, world)") view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method(string) view returns (uint256)'), ['hola(mundo, world)']]);
		expect(parseFunction('method( string  " hola mundo ", string " hola( ,world)"  ) view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method(string, string) view returns (uint256)'), [' hola mundo ', ' hola( ,world)']]);
		expect(parseFunction('method(string  "hola\\"mundo") view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method(string) view returns (uint256)'), ['hola\\"mundo']]);
	});

	it("should parse function inferring argument types", () => {
		expect(parseFunction('method(1) view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method(uint8) view returns (uint256)'), ['1']]);
		expect(parseFunction('method(1, "hola, mundo", uint8 2) view returns (uint256)'))
			.to.be.deep.equal([Fragment.fromString('function method(uint8, string, uint8) view returns (uint256)'), ['1', 'hola, mundo', '2']]);
		expect(parseFunction("method(0x5425890298aed601595a70AB815c96711a31Bc65) view returns (uint256)"))
			.to.be.deep.equal([Fragment.fromString('function method(address) view returns (uint256)'), ['0x5425890298aed601595a70AB815c96711a31Bc65']]);
	});

});
