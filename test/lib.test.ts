import { expect } from "chai";
import { Fragment } from "ethers/lib/utils";
import { EthersMode } from "../src/lib";
import { Address, Call, parseAddress, parseCall, parseNet } from "../src/parse";

declare global {
	interface String {
		asNet(this: string): string | null;
		asAddress(this: string): Address;
		asCall(this: string): Call;
	}
}

String.prototype.asNet = function (this: string) { return parseNet(this); };
String.prototype.asAddress = function (this: string) { return parseAddress(this) as Address; };
String.prototype.asCall = function (this: string) { return parseCall(this) as Call; };

describe('EthersMode', () => {

	describe('net', () => {

		it('should accept valid networks', () => {
			const mode = new EthersMode();

			mode.net('fuji');
			expect(mode.currentNetwork).to.be.equal('fuji');

			mode.net('http://localhost:8545');
			expect(mode.currentNetwork).to.be.equal('http://localhost:8545');
		});

	});

	describe('address', () => {

		it('should accept valid addresses while tracking symbols', () => {
			const mode = new EthersMode();

			mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'.asAddress());
			expect(mode.symbols).to.be.have.property('this', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8');

			mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.asAddress());
			expect(mode.symbols).to.be.have.property('this', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');

			mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token'.asAddress());
			expect(mode.symbols).to.be.have.property('this', '0x5425890298aed601595a70AB815c96711a31Bc65');
			expect(mode.symbols).to.be.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');

			mode.address('0x07865c6E87B9F70255377e024ace6630C1Eaa37F'.asAddress());
			expect(mode.symbols).to.be.have.property('this', '0x07865c6E87B9F70255377e024ace6630C1Eaa37F');

			expect(mode.symbols).to.be.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');
		});

		it('should _also_ accept valid signers while tracking symbols', () => {
			const mode = new EthersMode();

			mode.address('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'.asAddress());
			expect(mode.thisPrivateKey).to.be.equal('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
			expect(mode.symbols).to.be.have.property('this', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');

			mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.asAddress());
			expect(mode.thisPrivateKey).to.be.undefined;
			expect(mode.symbols).to.be.have.property('this', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');

			mode.address('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 as signer'.asAddress());
			expect(mode.thisPrivateKey).to.be.equal('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
			expect(mode.symbols).to.be.have.property('this', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
			expect(mode.symbols).to.be.have.property('signer', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
		});

		it('should reject duplicated address alias definitions', () => {
			const mode = new EthersMode();

			mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token'.asAddress());
			expect(mode.symbols).to.be.have.property('this', '0x5425890298aed601595a70AB815c96711a31Bc65');
			expect(mode.symbols).to.be.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');

			expect(() => mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8 as token'.asAddress()))
				.to.throw('identifier `token` already defined');
			expect(mode.symbols).to.be.have.property('this', '0x5425890298aed601595a70AB815c96711a31Bc65');
			expect(mode.symbols).to.be.have.property('token', '0x5425890298aed601595a70AB815c96711a31Bc65');
		});

	});

	describe('call', () => {

		it('should resolve method calls', () => {
			const mode = new EthersMode();

			mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'.asAddress());
			const call = mode.call('token.method(this, 2, eoa, "hola, mundo") view'.asCall());
			mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token'.asAddress());
			mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 as eoa'.asAddress());

			const resolvedCall = call.resolve();
			expect(resolvedCall).to.be.deep.equal({
				contractRef: '0x5425890298aed601595a70AB815c96711a31Bc65',
				func: Fragment.fromString('function method(address, uint8, address, string) view'),
				args: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '2', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'hola, mundo'],
				privateKey: undefined,
				network: undefined,
			});
			expect([...resolvedCall.getUnresolvedSymbols()]).to.be.deep.equal([]);
		});

		it('should reject undefined signer', () => {
			const mode = new EthersMode();

			expect(() => mode.call('method(2)'.asCall()))
				.to.throw('sending a transaction requires a signer');

			mode.address('0x5425890298aed601595a70AB815c96711a31Bc65'.asAddress());

			expect(() => mode.call('method(2)'.asCall()))
				.to.throw('sending a transaction requires a signer');
		});

		it('should accept current signer', () => {
			const mode = new EthersMode();

			mode.address('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'.asAddress());
			const call = mode.call('method(2)'.asCall());

			expect(call.resolve()).to.be.deep.equal({
				contractRef: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
				func: Fragment.fromString('function method(uint8)'),
				args: ['2',],
				privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
				network: undefined,
			});
		});

		it('should support unresolved this', () => {
			const mode = new EthersMode();

			const call = mode.call('token.method(this, 2, eoa) view'.asCall());
			mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token'.asAddress());
			mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 as eoa'.asAddress());

			expect(call.resolve()).to.be.deep.equal({
				contractRef: '0x5425890298aed601595a70AB815c96711a31Bc65',
				func: Fragment.fromString('function method(address, uint8, address) view'),
				args: [undefined, '2', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
				privateKey: undefined,
				network: undefined,
			});
		});

		it('should support unresolved contract ref', () => {
			const mode = new EthersMode();

			let call = mode.call('method(2) view returns (uint8)'.asCall());
			expect(call.resolve())
				.to.be.deep.equal({
					contractRef: undefined,
					func: Fragment.fromString('function method(uint8) view returns (uint8)'),
					args: ['2'],
					privateKey: undefined,
					network: undefined,
				});

			mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'.asAddress());
			call = mode.call('token.method(this, 2, eoa) view'.asCall());
			mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 as eoa'.asAddress());

			const resolvedCall = call.resolve();
			expect(resolvedCall)
				.to.be.deep.equal({
					contractRef: undefined,
					func: Fragment.fromString('function method(address, uint8, address) view'),
					args: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '2', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
					privateKey: undefined,
					network: undefined,
				});
			expect([...resolvedCall.getUnresolvedSymbols()]).to.be.deep.equal(['token']);
		});

		it('should support unresolved arguments', () => {
			const mode = new EthersMode();

			mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'.asAddress());
			const call = mode.call('token.method(this, 2, eoa) view'.asCall());
			mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token'.asAddress());

			const resolvedCall = call.resolve();
			expect(resolvedCall).to.be.deep.equal({
				contractRef: '0x5425890298aed601595a70AB815c96711a31Bc65',
				func: Fragment.fromString('function method(address, uint8, address) view'),
				args: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '2', undefined],
				privateKey: undefined,
				network: undefined,
			});
			expect([...resolvedCall.getUnresolvedSymbols()]).to.be.deep.equal(['eoa']);
		});

	});

});
