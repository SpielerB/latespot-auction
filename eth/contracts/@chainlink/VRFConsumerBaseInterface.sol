// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface VRFConsumerBaseInterface {
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external;
}
