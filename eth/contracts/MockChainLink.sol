pragma solidity ^0.8.0;


import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract MockChainLink is VRFCoordinatorV2Interface {

    uint256[] private randomWords = new uint256[](1);

    function setRandomWords(uint256[] memory words) public {
        randomWords = words;
    }

    function getRequestConfig()
    external
    view
    returns (
        uint16,
        uint32,
        bytes32[] memory
    ) {
        uint16 a = 0;
        uint32 b = 0;
        bytes32[] memory c = new bytes32[](0);
        return (a, b, c);
    }

    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId) {
        VRFConsumerBaseV2 caller = VRFConsumerBaseV2(msg.sender);
        caller.rawFulfillRandomWords(requestId, randomWords);
        return 42;
    }

    function createSubscription() external returns (uint64 subId) {
        return 0;
    }

    function getSubscription(uint64 subId)
    external
    view
    returns (
        uint96 balance,
        uint64 reqCount,
        address owner,
        address[] memory consumers
    ) {
        uint96 a = 0;
        uint64 b = 0;
        address c = address(0);
        address[] memory d = new address[](0);
        return (a, b, c, d);
    }

    function requestSubscriptionOwnerTransfer(uint64 subId, address newOwner) external {}

    function acceptSubscriptionOwnerTransfer(uint64 subId) external {}

    function addConsumer(uint64 subId, address consumer) external {}

    function removeConsumer(uint64 subId, address consumer) external {}

    function cancelSubscription(uint64 subId, address to) external {}

    function pendingRequestExists(uint64 subId) external view returns (bool) {
        return false;
    }


}
