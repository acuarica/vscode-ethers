import { expect } from "chai";
import { Fragment } from "ethers/lib/utils";
import { CallResolver, EthersMode } from "../src/lib";

describe('EthersMode', () => {

	it('should accept valid addresses', () => {
		const mode = new EthersMode();

		mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
		expect(mode.symbols).to.be.have.property('this', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8');

		mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
		expect(mode.symbols).to.be.have.property('this', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');

		mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token');
		expect(mode.symbols).to.be.have.property('this', '0x5425890298aed601595a70AB815c96711a31Bc65');
		expect(mode.symbols).to.be.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');
	});

	it('should reject invalid addresses', () => {
		const mode = new EthersMode();

		mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token');
		expect(mode.symbols).to.be.have.property('this', '0x5425890298aed601595a70AB815c96711a31Bc65');
		expect(mode.symbols).to.be.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');

		expect(mode.address('0x5425890298aed601595a70AB815c96711a31Bc64 as token')).instanceOf(Error);
		expect(mode.symbols).to.be.have.property('this', '0x5425890298aed601595a70AB815c96711a31Bc65');
		expect(mode.symbols).to.be.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');
	});

	it('should reject duplicated identifiers', () => {
		const mode = new EthersMode();

		mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token');
		expect(mode.symbols).to.be.have.property('this', '0x5425890298aed601595a70AB815c96711a31Bc65');
		expect(mode.symbols).to.be.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');

		expect(mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8 as token'))
			.to.have.property('message', 'identifier `token` already defined');
		expect(mode.symbols).to.be.have.property('this', '0x5425890298aed601595a70AB815c96711a31Bc65');
		expect(mode.symbols).to.be.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');
	});

	it('should reject undefined signer', () => {
		const mode = new EthersMode();

		mode.address('0x5425890298aed601595a70AB815c96711a31Bc65');
		const call = mode.call('method(2)') as CallResolver;

		expect(call).to.have.property('message', 'sending a transaction requires a signer');
	});

	it('should accept current signer', () => {
		const mode = new EthersMode();

		mode.address('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
		const call = mode.call('method(2)') as CallResolver;

		expect(call.resolve()).to.be.deep.equal({
			contractRef: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
			func: Fragment.fromString('function method(uint8)'),
			args: ['2',],
			privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
		});
	});


	it('should resolve method calls', () => {
		const mode = new EthersMode();

		mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
		const call = mode.call('token.method(this, 2, eoa, "hola, mundo") view') as CallResolver;
		mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token');
		mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 as eoa');

		expect(call.resolve()).to.be.deep.equal({
			contractRef: '0x5425890298aed601595a70AB815c96711a31Bc65',
			func: Fragment.fromString('function method(address, uint8, address, string) view'),
			args: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '2', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'hola, mundo'],
			privateKey: undefined,
		});
	});

	it('should support unresolved this', () => {
		const mode = new EthersMode();

		const call = mode.call('token.method(this, 2, eoa) view') as CallResolver;
		mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token');
		mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 as eoa');

		expect(call.resolve()).to.be.deep.equal({
			contractRef: '0x5425890298aed601595a70AB815c96711a31Bc65',
			func: Fragment.fromString('function method(address, uint8, address) view'),
			args: [undefined, '2', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
			privateKey: undefined,
		});
	});

	it('should support unresolved contract ref', () => {
		const mode = new EthersMode();

		mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
		const call = mode.call('token.method(this, 2, eoa) view') as CallResolver;
		mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 as eoa');

		expect(call.resolve()).to.be.deep.equal({
			contractRef: undefined,
			func: Fragment.fromString('function method(address, uint8, address) view'),
			args: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '2', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
			privateKey: undefined,
		});
	});

	it('should support unresolved arguments', () => {
		const mode = new EthersMode();

		mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
		const call = mode.call('token.method(this, 2, eoa) view') as CallResolver;
		mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token');

		expect(call.resolve()).to.be.deep.equal({
			contractRef: '0x5425890298aed601595a70AB815c96711a31Bc65',
			func: Fragment.fromString('function method(address, uint8, address) view'),
			args: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '2', undefined],
			privateKey: undefined,
		});
	});

	it('should resolve method calls even when an identifier has been duplicated', () => {
		const mode = new EthersMode();

		mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
		const call = mode.call('token.method(this, 2, eoa) view') as CallResolver;
		mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token');
		expect(mode.address('0x5425890298aed601595a70AB815c96711a31Bc64 as token')).instanceOf(Error);

		expect(call.resolve()).to.be.deep.equal({
			contractRef: '0x5425890298aed601595a70AB815c96711a31Bc65',
			func: Fragment.fromString('function method(address, uint8, address) view'),
			args: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '2', undefined],
			privateKey: undefined,
		});
	});

});
