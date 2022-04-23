import { expect } from "chai";
import { parseFunction } from "../src/lib";

describe("lib", function () {

	it("should be able to make a deposit", function () {
		expect(parseFunction("balanceOf(0x5425890298aed601595a70AB815c96711a31Bc65) view returns (uint256)")).to.be.equal(1);
	});

});
