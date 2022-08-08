import { BigNumber } from 'ethers';

declare global {
    interface String {
        bn(this: string): BigNumber;
    }
}

String.prototype.bn = function (this: string) {
    return BigNumber.from(this);
};
