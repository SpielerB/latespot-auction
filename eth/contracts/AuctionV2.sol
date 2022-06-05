/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721RoyaltyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./@rarible/royalties-upgradeable/contracts/RoyaltiesV2Upgradeable.sol";

/// @title 3 Phase auction and minting for the latespot NFT project
contract Auction is ERC721Upgradeable, ERC721RoyaltyUpgradeable, OwnableUpgradeable, RoyaltiesV2Upgradeable {
    using MathUpgradeable for uint;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    using ECDSAUpgradeable for bytes32;
    using ECDSAUpgradeable for bytes;


    uint96 private constant _royaltyPercentageBasisPoints = 1000;

    /*
        Initialisation
    */
    uint256 public totalSupply;

    address public signatureAddress;

    address[] private _ticketHolders;
    mapping(address => uint256) private _ticketHolderMap;
    mapping(address => bool) private _whitelistMap;

    string private __baseURI;
    string private _contractURI;

    /*
        Auction
    */
    bool public privateStarted;
    bool public privateStopped;
    uint256 public privatePrice;
    uint256 public privateTicketCount;
    uint256 public privateTicketSupply;

    bool public publicStarted;
    uint256 public publicPrice;
    uint256 public privateTicketCount;
    uint256 public privateTicketSupply;

    function initialize(string memory tokenName_, string memory tokenSymbol_, uint256 totalTicketSupply_, address signatureAddress_, string memory baseURI_, string memory contractURI_) public initializer {
        __ERC721_init(tokenName_, tokenSymbol_);
        __ERC721Royalty_init();
        __Ownable_init();

        totalSupply = totalTicketSupply_;
        signatureAddress = signatureAddress_;
        __baseURI = baseURI_;
        _contractURI = contractURI_;

        _setDefaultRoyalty(owner(), _royaltyPercentageBasisPoints);
        // 10% royalties
    }

    // TODO: Whitelist

    /*
    * Starts the public auction with a specific price and supply. This method may not be called once the auction has been started.
    */
    function startPrivateAuction(uint256 price_, uint256 supply_) public onlyOwner {}

    /*
    * Returns true if the private auction has been started and there are still tokens left. false otherwise
    */
    function privateAuctionActive() public view {}

    /*
    * Buy (value/price) tokens while the private auction is active
    */
    function buyPrivate(bytes memory signature) public payable  {}

    /*
    * Stops the private auction. May only be called if the private auction is active.
    */
    function stopPrivateAuction() public onlyOwner {}

    /*
    * Starts the public auction with a specific price and supply. This method may not be called once the auction has been started.
    */
    function startPublicAuction(uint256 price_, uint256 supply_) public onlyOwner {}

    /*
    * Returns true if the public auction has been started and there are still tokens left. false otherwise
    */
    function publicAuctionActive() public view {}

    /*
    * Buy (value/price) tokens while the public auction is active
    */
    function buyPublic(bytes memory signature) public payable {}

    // TODO: Stop function

    /*
    * Mint a specific amount of tokens before the auction starts.
    * Can be used to active the collection an a marketplace, like openseas.
    */
    function premint(uint256 count) public onlyOwner {}

    /*
    * Mint tokens for n ticket holders.
    */
    function mintAndDistribute(uint256 batchTicketHolderCount) public onlyOwner {}

    /*
    * Withdraw all the ETH stored inside the contract
    */
    function withdraw() public onlyOwner {}

    /*
    * Reveals the tokens by changing the baseURI_ to the correct path
    */
    function reveal(string memory baseURI_) public onlyOwner {}

    /*
    * Locks a token. While locked the token may not be traded
    */
    function stake(uint256 token) public {}

    /*
    * Unlocks a token. This will unlock the token for trading and set the stake level for this token.
    */
    function unstake(uint256 token) public {
        // days -> level -> map
        // unstake -> map
        // uint256 -> uint256
    }

    /*
    * Returns the stake level for the given token
    */
    function stakeLevel(uint256 token) public view {}

    // TODO: add stake level setter

}