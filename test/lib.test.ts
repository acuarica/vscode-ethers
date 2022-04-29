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

	it('should resolve method calls', () => {
		const mode = new EthersMode();

		mode.address('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');

		const call = mode.call('token.method(this, 2, eoa, "hola, mundo")')!;

		mode.address('0x5425890298aed601595a70AB815c96711a31Bc65 as token');

		mode.address('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 as eoa');

		expect((call as CallResolver).resolve()).to.be.deep.equal({
			contractRef: '0x5425890298aed601595a70AB815c96711a31Bc65',
			func: Fragment.fromString('function method(address, uint8, address, string)'),
			args: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '2', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'hola, mundo'],
		});

	});

});
