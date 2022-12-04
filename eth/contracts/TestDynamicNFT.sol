// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract TestDynamicNFT {
/*
    address constant vrfCoordinator = 0x6168499c0cFfCaCD319c818142124B7A15E857ab;
    bytes32 keyHash = 0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc;
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;
    uint32 numWords =  1;

    mapping(uint256 => uint256) private _tokenLevel;

    uint256 private _seed;
    bool private _revealed;

    string private _baseURI;

    constructor(string memory tokenName_, string memory tokenSymbol_) ERC721(tokenName_, tokenSymbol_) VRFConsumerBaseV2(vrfCoordinator) {
    }

    function mint() public onlyOwner {
        for (uint256 i = 0; i < 10; ++i) {
            _safeMint(owner(), i);
        }
    }

    function requestReveal(string memory baseURI_) external onlyOwner {
        VRFCoordinatorV2Interface(vrfCoordinator).requestRandomWords(
            keyHash,
            6245,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        reveal(randomWords[0]);
    }

    function reveal(uint256 seed) private {
        _seed = seed;
        _revealed = true;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        if (_revealed) return formatTokenURI(tokenId);
        return abi.encodePacked(_baseURI, '/default.json');
    }

    function formatTokenURI(uint256 tokenId) private view returns (string memory) {
        return "";
    }

    function setTokenLevel(uint256 tokenId, uint256 level) public onlyOwner {
        _tokenLevel[tokenId] = level;
    }

*/
}
