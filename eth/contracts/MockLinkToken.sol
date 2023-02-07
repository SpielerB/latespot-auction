// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "./MockVRFWrapper.sol";
import "hardhat/console.sol";

// Very unsafe mock link token
contract MockLinkToken is LinkTokenInterface {

    mapping(address => uint256) balances;

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool success) {
        return true;
    }

    function allowance(address, address) external pure returns (uint256) {
        return 42;
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return balances[owner];
    }

    function decimals() external pure returns (uint8) {
        return 0;
    }

    function decreaseApproval(address, uint256) external pure returns (bool) {
        return true;
    }

    function increaseApproval(address, uint256) pure external {

    }

    function name() external pure returns (string memory) {
        return "ChainLink Token";
    }

    function symbol() external pure returns (string memory) {
        return "LINK";
    }

    function totalSupply() external pure returns (uint256) {
        return 12345678901234567890;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return true;
    }

    function fund(address wallet, uint256 value) external {
        balances[wallet] = value;
    }

    function transferAndCall(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external returns (bool) {
        console.log("Transfer to %s", _to);
        if (isContract(_to)) {
            contractFallback(_to, _value, _data);
        }
        return true;
    }

    function contractFallback(address _to, uint256 _value, bytes memory _data)
    private
    {
        console.log("Calling %s", _to);
        MockVRFWrapper receiver = MockVRFWrapper(_to);
        receiver.onTokenTransfer(msg.sender, _value, _data);
    }

    function isContract(address _addr) private view returns (bool hasCode) {
        uint length;
        assembly {length := extcodesize(_addr)}
        return length > 0;
    }

}
