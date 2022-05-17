import { expect } from "chai";
// import { BigNumber, ContractFactory, providers, Wallet } from "ethers";
// import ganache from "ganache";
// import * as deposit from "../artifacts/LDToken.json";
import { EthersMode } from "../src/lib/mode";
import { execCall } from "../src/lib/provider";

describe('execCall', function () {

    this.timeout(10000);

    let ldtokenAddress: string;

    before(async () => {

        // const server = ganache.server({
        //     wallet: {
        //         accounts: [
        //             { balance: '0xffffffffffffffffffffff', secretKey: '0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6' }
        //         ],
        //     }
        // });
        // const PORT = 8545;
        // await server.listen(PORT);
        // return new Promise((resolve, _reject) => {

        //     console.log(`ganache listening on .`);

        //     server.listen(PORT, async err => {
        //         console.log(`ganache listening on port ${PORT}...`);

        //         if (err) throw err;

        //         console.log(`ganache listening on port ${PORT}...`);
        // const provider = server.provider;
        // const accounts = await provider.request({
        // method: "eth_accounts",
        // params: []
        // });
        // console.log(accounts);

        // const provider = new providers.Web3Provider(server.provider as any);

        // const provider = new providers.JsonRpcProvider('http://localhost:8545');

        // const deployer = new Wallet('0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6', provider);
        // // const balance = ;
        // expect(await provider.getBalance(deployer.address)).to.be.deep.equal(BigNumber.from('0xffffffffffffffffffffff'));

        // const factory = new ContractFactory(deposit.abi, deposit.bytecode, deployer);
        // const contract = await factory.deploy('LD Token', 'LDT');
        // ldtokenAddress = contract.address;

        // resolve(1);
        // });

        // });

    });

    it.skip('should return value from exec view calls', async () => {
        const mode = new EthersMode();
        mode.net('http://localhost:8545');
        mode.address(ldtokenAddress.asAddress());

        {
            const call = mode.call('name() view returns (string)'.asCall());
            expect(await execCall(call.resolve())).to.be.deep.equal(['LD Token']);
        }
        {
            const call = mode.call('symbol() view returns (string)'.asCall());
            expect(await execCall(call.resolve())).to.be.deep.equal(['LDT']);
        }
    });

});
