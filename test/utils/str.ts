import { BigNumber } from 'ethers';
import { Address, Call, parseAddress, parseCall, parseNet } from '../../src/lib/parse';

declare global {
    interface String {
        asNet(this: string): string | null;
        asAddress(this: string): Address;
        asCall(this: string): Call;
    }
}

String.prototype.asNet = function (this: string) {
    return parseNet(this);
};

String.prototype.asAddress = function (this: string) {
    return parseAddress(this) as Address;
};

String.prototype.asCall = function (this: string) {
    return parseCall(this);
};

declare global {
    interface String {
        bn(this: string): BigNumber;
    }
}

String.prototype.bn = function (this: string) {
    return BigNumber.from(this);
};
