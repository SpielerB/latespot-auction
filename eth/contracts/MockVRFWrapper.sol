// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/VRFV2WrapperInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFV2WrapperConsumerBase.sol";
import "hardhat/console.sol";

contract MockVRFWrapper is VRFV2WrapperInterface {

    uint256 public lastRequestId;

    struct Callback {
        address callbackAddress;
        uint32 callbackGasLimit;
        uint256 requestGasPrice;
        int256 requestWeiPerUnitLink;
        uint256 juelsPaid;
    }

    mapping(uint256 => Callback) /* requestID */ /* callback */
    public s_callbacks;

    VRFCoordinatorV2Interface COORDINATOR;

    constructor(address coordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(coordinator);
    }

    function calculateRequestPrice(uint32 _callbackGasLimit) external pure returns (uint256) {
        return _callbackGasLimit;
    }

    function estimateRequestPrice(uint32 _callbackGasLimit, uint256 _requestGasPriceWei) external pure returns (uint256) {
        return _callbackGasLimit * _requestGasPriceWei;
    }

    function onTokenTransfer(
        address _sender,
        uint256 _amount,
        bytes calldata _data
    ) external {

        (uint32 callbackGasLimit, uint16 requestConfirmations, uint32 numWords) = abi.decode(_data, (uint32, uint16, uint32));
        uint32 eip150Overhead = 0;
        int256 weiPerUnitLink = 0;
        uint64 subId = 42;
        uint256 price = 0;
        require(_amount >= price, "fee too low");

        console.log("Sender: %s", _sender);

        // requestID will always be 42 in the mock
        s_callbacks[42] = Callback({
        callbackAddress : _sender,
        callbackGasLimit : callbackGasLimit,
        requestGasPrice : tx.gasprice,
        requestWeiPerUnitLink : weiPerUnitLink,
        juelsPaid : _amount
        });

        uint256 requestId = COORDINATOR.requestRandomWords(
            0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc,
            subId,
            requestConfirmations,
            callbackGasLimit + eip150Overhead,
            numWords
        );
        lastRequestId = requestId;
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal {
        Callback memory callback = s_callbacks[_requestId];

        console.log("Callback Address: %s", callback.callbackAddress);
        console.log("Self Address: %s", address(this));
        delete s_callbacks[_requestId];
        require(callback.callbackAddress != address(0), "request not found");

        VRFV2WrapperConsumerBase c = VRFV2WrapperConsumerBase(callback.callbackAddress);
        c.rawFulfillRandomWords(_requestId, _randomWords);
    }

    function rawFulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) external {
        fulfillRandomWords(_requestId, _randomWords);
    }

}
