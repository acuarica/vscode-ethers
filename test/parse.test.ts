import { expect } from "chai";
import { Fragment } from "ethers/lib/utils";
import { parseNet, parseAddress, parseCall, inferArgumentType, patchFragmentSignature, Id, parse } from "../src/parse";

describe("parse", () => {

	it("should ignore blanks and comments", () => {
		expect(parse('')).to.be.null;
		expect(parse('   ')).to.be.null;
		expect(parse('#   ')).to.be.null;
		expect(parse('  #   ')).to.be.null;
		expect(parse('  # net fuji  ')).to.be.null;
	});

	it("should accept valid declarations", () => {
		expect(parse('net fuji')).to.have.property('kind', 'net');
		expect(parse('0x5425890298aed601595a70AB815c96711a31Bc65')).to.have.property('kind', 'address');
		expect(parse('method()')).to.have.property('kind', 'call');
	});

});

describe("parseNet", () => {

	it("should accept valid networks", () => {
		expect(parseNet('net fuji')).to.be.equal('fuji');
		expect(parseNet('net  fuji  ')).to.be.equal('fuji');
		expect(parseNet('net  hola^fuji  ')).to.be.equal('hola^fuji');
	});

	it("should reject invalid networks", () => {
		expect(parseNet('')).to.be.null;
		expect(parseNet('net ')).to.be.null;
		expect(parseNet(' net ')).to.be.null;
		expect(parseNet(' net fu ji')).to.be.null;
	});

});

describe("parseAddress", () => {

	it("should reject invalid addresses", () => {
		expect(parseAddress('123'))
			.to.be.null;
		expect(parseAddress('0x123'))
			.to.be.null;
		expect(() => parseAddress('0x8Ba1f109551bD432803012645Ac136ddd64DBA72'))
			.to.throw('bad address checksum');
	});

	it("should parse valid addresses", () => {
		expect(parseAddress('0x5425890298aed601595a70AB815c96711a31Bc65'))
			.to.be.deep.equal({
				address: '0x5425890298aed601595a70AB815c96711a31Bc65',
				isChecksumed: true,
				privateKey: undefined,
				symbol: undefined,
			});
		expect(parseAddress('5425890298aed601595a70AB815c96711a31Bc65'))
			.to.be.deep.equal({
				address: '0x5425890298aed601595a70AB815c96711a31Bc65',
				isChecksumed: false,
				privateKey: undefined,
				symbol: undefined,
			});
		expect(parseAddress('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'))
			.to.be.deep.equal({
				address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
				isChecksumed: false,
				privateKey: undefined,
				symbol: undefined,
			});
	});

	it("should parse valid addresses with alias", () => {
		expect(parseAddress('0x5425890298aed601595a70AB815c96711a31Bc65 as token'))
			.to.be.deep.equal({
				address: '0x5425890298aed601595a70AB815c96711a31Bc65',
				isChecksumed: true,
				privateKey: undefined,
				symbol: 'token',
			});

		expect(parseAddress('0x0000000000000000000000000000000000000000 as zero'))
			.to.be.deep.equal({
				address: '0x0000000000000000000000000000000000000000',
				isChecksumed: true,
				privateKey: undefined,
				symbol: 'zero',
			});
	});

	it("should reject invalid private keys", () => {
		expect(() => parseAddress('0000000000000000000000000000000000000000000000000000000000000000'))
			.to.throw('Invalid private key');
	});

	it("should parse private keys to addresses", () => {
		expect(parseAddress('0xb976778317b23a1385ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d'))
			.to.be.deep.equal({
				address: '0x0Ac1dF02185025F65202660F8167210A80dD5086',
				isChecksumed: false,
				privateKey: '0xb976778317b23a1385ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d',
				symbol: undefined,
			});

		expect(parseAddress('0xb976778317b23a1385ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d as signer'))
			.to.be.deep.equal({
				address: '0x0Ac1dF02185025F65202660F8167210A80dD5086',
				isChecksumed: false,
				privateKey: '0xb976778317b23a1385ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d',
				symbol: 'signer',
			});
	});

});

describe("parseCall", () => {

	['', 'function ', '  function '].forEach(prefix => {

		it(`should reject invalid function ^${prefix}`, () => {
			expect(() => parseCall(prefix + 'method view returns (uint256)'))
				.to.throw('invalid function signature');
		});

		it(`should parse an argless function ^${prefix}`, () => {
			expect(parseCall(prefix + 'method() view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method() view returns (uint256)'),
					values: [],
					contractRef: undefined
				});
			expect(parseCall(prefix + '  method (  ) view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method() view returns (uint256)'),
					values: [],
					contractRef: undefined
				});
		});

		it(`should parse function call with basic types ^${prefix}`, () => {
			expect(parseCall(prefix + 'method(uint8 1) view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(uint8) view returns (uint256)'),
					values: ['1'],
					contractRef: undefined
				});
			expect(parseCall(prefix + 'method( uint8  1  ) view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(uint8) view returns (uint256)'),
					values: ['1'],
					contractRef: undefined
				});
			expect(parseCall(prefix + 'method( uint8  1   ,  string  "hola"   ) view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(uint8, string) view returns (uint256)'),
					values: ['1', 'hola'],
					contractRef: undefined
				});
			expect(parseCall(prefix + 'method( uint8  2   ,  string  " hola, mundo", string "hello"   ) view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(uint8, string, string) view returns (uint256)'),
					values: ['2', ' hola, mundo', 'hello'],
					contractRef: undefined
				});
		});


		it(`should parse 'string' arguments properly ^${prefix}`, () => {
			expect(parseCall(prefix + '  method   ( string "hola(mundo, world)") view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(string) view returns (uint256)'),
					values: ['hola(mundo, world)'],
					contractRef: undefined
				});
			expect(parseCall(prefix + 'method( string  " hola mundo ", string " hola( ,world)"  ) view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(string, string) view returns (uint256)'),
					values: [' hola mundo ', ' hola( ,world)'],
					contractRef: undefined
				});
			expect(parseCall(prefix + 'method(string  "hola\\"mundo") view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(string) view returns (uint256)'),
					values: ['hola\\"mundo'],
					contractRef: undefined
				});
		});

		it(`should parse function signatures inferring argument types ^${prefix}`, () => {
			expect(parseCall(prefix + 'method(1) view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(uint8) view returns (uint256)'),
					values: ['1'],
					contractRef: undefined
				});
			expect(parseCall(prefix + 'method(1, "hola, mundo", uint8 2) view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(uint8, string, uint8) view returns (uint256)'),
					values: ['1', 'hola, mundo', '2'],
					contractRef: undefined
				});
			expect(parseCall(prefix + "method(0x5425890298aed601595a70AB815c96711a31Bc65) view returns (uint256)"))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(address) view returns (uint256)'),
					values: ['0x5425890298aed601595a70AB815c96711a31Bc65'],
					contractRef: undefined
				});
		});

		it(`should parse functions signatures with symbols ^${prefix}`, () => {
			expect(parseCall(prefix + 'method(token, "token") view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(address, string) view returns (uint256)'),
					values: [new Id('token'), 'token'],
					contractRef: undefined
				});
			expect(parseCall(prefix + 'method(token, address "token") view returns (uint256)'))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(address, address) view returns (uint256)'),
					values: [new Id('token'), 'token'],
					contractRef: undefined
				});
		});

		it(`should parse functions signatures with contract ref ^${prefix}`, () => {
			expect(parseCall(prefix + "hola.method(1) view returns (uint256)"))
				.to.be.deep.equal({
					method: Fragment.fromString('function method(uint8) view returns (uint256)'),
					values: ['1'],
					contractRef: new Id('hola')
				});
		});

	});

});

describe('inferArgumentType', () => {

	it('should return null when value is unknown', () => {
		expect(inferArgumentType('')).to.be.equal(null);
		expect(inferArgumentType('  ')).to.be.equal(null);
		expect(inferArgumentType(' 0')).to.be.equal(null);
		expect(inferArgumentType('0x')).to.be.equal(null);
		expect(inferArgumentType('arg')).to.be.equal(null);
		expect(inferArgumentType('0_')).to.be.equal(null);
		expect(inferArgumentType('_0')).to.be.equal(null);
		expect(inferArgumentType(' 0x70997970c51812dc3a010c7d01b50e0d17dc79c8')).to.be.equal(null);
	});

	it('should infer type for known values', () => {
		expect(inferArgumentType('0x70997970c51812dc3a010c7d01b50e0d17dc79c8')).to.be.equal('address');
		expect(inferArgumentType('123')).to.be.equal('uint8');
		expect(inferArgumentType('0xabc')).to.be.equal('uint256');
	});

	it('should infer type for numbers with underscore', () => {
		expect(inferArgumentType('10_0')).to.be.equal('uint8');
		expect(inferArgumentType('0_0')).to.be.equal('uint8');
		expect(inferArgumentType('50_000')).to.be.equal('uint256');
		expect(inferArgumentType('50_000_000')).to.be.equal('uint256');
	});

});

describe('patchFragmentSignature', () => {

	it('should reject patching non-closed strings', () => {
		expect(() => patchFragmentSignature('  method   ( string "hola(mundo, world)) view returns (uint256)'))
			.to.throw('parsing error: unterminated string literal');
		expect(() => patchFragmentSignature('method(string  "hola\\") view returns (uint256)'))
			.to.throw('parsing error: unterminated string literal');
		expect(() => patchFragmentSignature('method( string  " hola \\", string " hola( ,world)"  ) view returns (uint256)'))
			.to.throw('parsing error: unterminated string literal');
	});

	it('should patch string values', () => {
		expect(patchFragmentSignature('  method   ( string "hola(mundo, world)") view returns (uint256)'))
			.to.be.deep.equal([
				'  method   ( string $$arg0) view returns (uint256)',
				{
					'$$arg0': 'hola(mundo, world)'
				}]
			);
		expect(patchFragmentSignature('method(string  "hola\\"mundo") view returns (uint256)'))
			.to.be.deep.equal([
				'method(string  $$arg0) view returns (uint256)',
				{
					'$$arg0': 'hola\\"mundo'
				}]
			);
		expect(patchFragmentSignature('method( string  " hola mundo ", string " hola( ,world)"  ) view returns (uint256)'))
			.to.be.deep.equal([
				'method( string  $$arg0, string $$arg1  ) view returns (uint256)',
				{
					'$$arg0': ' hola mundo ',
					'$$arg1': ' hola( ,world)'
				}]
			);
	});

});
