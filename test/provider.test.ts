import { expect } from "chai";
import { BigNumber, ContractFactory, providers, Wallet } from "ethers";
import ganache from "ganache";
import * as deposit from "../artifacts/LDToken.json";
import { EthersMode } from "../src/lib/mode";
import { execCall } from "../src/lib/provider";

describe('execCall', function () {

    this.timeout(4000);

    let provider: providers.Provider;
    let ldtokenAddress: string;

    const createProvider = (_network: string) => provider;

    before(async () => {
        provider = new providers.Web3Provider(ganache.provider({
            quiet: true,
            wallet: {
                accounts: [
                    { balance: '0xffffffffffffffffffffff', secretKey: '0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6' }
                ],
            }
        }) as any);

        const deployer = new Wallet('0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6', provider);
        expect(await provider.getBalance(deployer.address)).to.be.deep.equal(BigNumber.from('0xffffffffffffffffffffff'));

        const factory = new ContractFactory(deposit.abi, deposit.bytecode, deployer);
        const contract = await factory.deploy('LD Token', 'LDT');
        ldtokenAddress = contract.address;
    });

    it('should return value from exec view calls', async () => {
        const mode = new EthersMode();
        mode.net('_unused');
        mode.address(ldtokenAddress.asAddress());

        {
            const call = mode.call('name() view returns (string)'.asCall());
            expect(await execCall(call.resolve(), createProvider)).to.be.deep.equal(['LD Token']);
        }
        {
            const call = mode.call('symbol() view returns (string)'.asCall());
            expect(await execCall(call.resolve(), createProvider)).to.be.deep.equal(['LDT']);
        }
    });

});
