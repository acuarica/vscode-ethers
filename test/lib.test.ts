import { expect } from "chai";
import { Fragment } from "ethers/lib/utils";
import { Parse, patchSig } from "../src/lib";

describe("Parse", () => {

	describe("address", () => {

		it("should reject invalid addresses", () => {
			const parse = new Parse();
			expect(parse.address('123')).to.be.null;
			expect(parse.address('0x123')).to.be.null;
			expect(parse.address('0x8Ba1f109551bD432803012645Ac136ddd64DBA72')).to.be.null;

			expect(parse.symbols).to.be.empty;
		});

		it("should parse valid addresses", () => {
			const parse = new Parse();

			expect(parse.address('0x5425890298aed601595a70AB815c96711a31Bc65'))
				.to.be.deep.equal(['0x5425890298aed601595a70AB815c96711a31Bc65', false, null]);
			expect(parse.address('5425890298aed601595a70AB815c96711a31Bc65'))
				.to.be.deep.equal(['0x5425890298aed601595a70AB815c96711a31Bc65', true, null]);
			expect(parse.symbols).to.be.empty;
		});

		it("should parse valid addresses with alias", () => {
			const parse = new Parse();

			expect(parse.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token'))
				.to.be.deep.equal(['0x5425890298aed601595a70AB815c96711a31Bc65', false, null]);
			expect(parse.address('0x0000000000000000000000000000000000000000 as zero'))
				.to.be.deep.equal(['0x0000000000000000000000000000000000000000', false, null]);
			expect(parse.symbols).to.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');
			expect(parse.symbols).to.have.property('zero', '0x0000000000000000000000000000000000000000');
		});

		it("should parse private keys to addresses", () => {
			const parse = new Parse();
			expect(parse.address('0xb976778317b23a1385ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d'))
				.to.be.deep.equal(['0x0Ac1dF02185025F65202660F8167210A80dD5086', true, '0xb976778317b23a1385ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d']);
			expect(parse.address('0xb976778317b23a1385ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d as account'))
				.to.be.deep.equal(['0x0Ac1dF02185025F65202660F8167210A80dD5086', true, '0xb976778317b23a1385ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d']);
			expect(parse.symbols).to.have.property('account', '0x0Ac1dF02185025F65202660F8167210A80dD5086');
		});

	});

	describe("call", () => {

		it("should parse an argless function", () => {
			const parse = new Parse();

			expect(parse.call('method() view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method() view returns (uint256)'), [], null]);
			expect(parse.call('  method (  ) view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method() view returns (uint256)'), [], null]);
		});

		it("should accept `function` keyword", () => {
			const parse = new Parse();

			expect(parse.call('function method() view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method() view returns (uint256)'), [], null]);
			expect(parse.call('  function method (  ) view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method() view returns (uint256)'), [], null]);
		});

		it("should parse function call with basic types", () => {
			const parse = new Parse();

			expect(parse.call('method(uint8 1) view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method(uint8) view returns (uint256)'), ['1'], null]);
			expect(parse.call('method( uint8  1  ) view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method(uint8) view returns (uint256)'), ['1'], null]);
			expect(parse.call('method( uint8  1   ,  string  "hola"   ) view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method(uint8, string) view returns (uint256)'), ['1', 'hola'], null]);
			expect(parse.call('method( uint8  2   ,  string  " hola, mundo", string "hello"   ) view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method(uint8, string, string) view returns (uint256)'), ['2', ' hola, mundo', 'hello'], null]);
		});

		it("should parse `string` arguments properly", () => {
			const parse = new Parse();

			expect(parse.call('  method   ( string "hola(mundo, world)") view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method(string) view returns (uint256)'), ['hola(mundo, world)'], null]);
			expect(parse.call('method( string  " hola mundo ", string " hola( ,world)"  ) view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method(string, string) view returns (uint256)'), [' hola mundo ', ' hola( ,world)'], null]);
			expect(parse.call('method(string  "hola\\"mundo") view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method(string) view returns (uint256)'), ['hola\\"mundo'], null]);
		});

		it("should parse function signatures inferring argument types", () => {
			const parse = new Parse();

			expect(parse.call('method(1) view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method(uint8) view returns (uint256)'), ['1'], null]);
			expect(parse.call('method(1, "hola, mundo", uint8 2) view returns (uint256)'))
				.to.be.deep.equal([Fragment.fromString('function method(uint8, string, uint8) view returns (uint256)'), ['1', 'hola, mundo', '2'], null]);
			expect(parse.call("method(0x5425890298aed601595a70AB815c96711a31Bc65) view returns (uint256)"))
				.to.be.deep.equal([Fragment.fromString('function method(address) view returns (uint256)'), ['0x5425890298aed601595a70AB815c96711a31Bc65'], null]);
		});

		it("should parse functions signatures with symbols", () => {
			const parse = new Parse();

			parse.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token');
			expect(parse.call("method(token) view returns (uint256)"))
				.to.be.deep.equal([Fragment.fromString('function method(address) view returns (uint256)'), ['0x5425890298aed601595a70AB815c96711a31Bc65'], null]);
		});

		it("should parse functions signatures symbols", () => {
			const parse = new Parse();

			expect(parse.call("hola.method(1) view returns (uint256)"))
				.to.be.deep.equal([Fragment.fromString('function method(uint8) view returns (uint256)'), ['1'], 'hola']);
		});

	});

});

describe('patchFuncSig', () => {

	it('should patch string values', () => {
		expect(patchSig('  method   ( string "hola(mundo, world)") view returns (uint256)'))
			.to.be.deep.equal(['  method   ( string $arg0) view returns (uint256)', { '$arg0': 'hola(mundo, world)' }]);
		expect(patchSig('method( string  " hola mundo ", string " hola( ,world)"  ) view returns (uint256)'))
			.to.be.deep.equal([
				'method( string  $arg0, string $arg1  ) view returns (uint256)',
				{
					'$arg0': ' hola mundo ',
					'$arg1': ' hola( ,world)'
				}]);
		expect(patchSig('method(string  "hola\\"mundo") view returns (uint256)'))
			.to.be.deep.equal(['method(string  $arg0) view returns (uint256)', { '$arg0': 'hola\\"mundo' }]);
	});

});