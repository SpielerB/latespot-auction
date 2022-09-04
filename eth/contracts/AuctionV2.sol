
/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "./@rarible/royalties/contracts/@rarible/RoyaltiesV2.sol";
import "./@rarible/royalties/contracts/@rarible/LibRoyaltiesV2.sol";

/// @title 2 Phase auction and minting for the latespot NFT project
contract AuctionV2 is ERC721, ERC721Royalty, Ownable, RoyaltiesV2, VRFConsumerBaseV2 {
    using Math for uint;
    using Counters for Counters.Counter;

    using ECDSA for bytes32;
    using ECDSA for bytes;

    using Strings for uint256;

    /*
        Constants
    */
    uint96 private constant _royaltyPercentageBasisPoints = 1000;


    bytes32 constant keyHash = 0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc; // TODO: use non rinkeby
    uint32 constant callbackGasLimit = 100000;
    uint16 constant requestConfirmations = 3;
    uint32 constant numWords =  1;

    /*
        Initialisation
    */
    address private immutable _vrfCoordinator;
    uint64 private immutable _chainLinkSubscriptionId;

    uint256 public immutable ticketsPerWallet;
    Counters.Counter private _tokenCounter;
    uint256 public preMintCount;

    address public signatureAddress;

    string private __baseURI;
    string private __realURI;
    string private _contractURI;

    mapping(address => bool) private _whitelistMap;

    /*
        Staking
    */
    uint256[] private _definedStakeLevels;
    mapping(uint256 => address) private _stakeOwnerMap;
    mapping(uint256 => uint256) private _stakeLevelTimeMap;
    mapping(uint256 => uint256) private _stakeStartTimeMap;

    /*
        Auction
    */
    Counters.Counter private _ticketCounter;
    address[] private _ticketHolders;

    bool public privateAuctionStarted;
    bool public privateAuctionStopped;
    uint256 public privateAuctionPrice;
    uint256 public privateAuctionTicketCount;
    uint256 public privateAuctionTicketSupply;
    mapping(address => uint256) public privateAuctionTicketMap;

    bool public publicAuctionStarted;
    bool public publicAuctionStopped;
    uint256 public publicAuctionPrice;
    uint256 public publicAuctionTicketCount;
    uint256 public publicAuctionTicketSupply;
    mapping(address => uint256) public publicAuctionTicketMap;

    /*
        Reveal
    */
    bool public revealed;
    uint256 private __seed;

    constructor(string memory tokenName_, string memory tokenSymbol_, address signatureAddress_, string memory baseURI_, string memory contractURI_, address vrfCoordinator_, uint256 ticketsPerWallet_, uint64 chainLinkSubscriptionId_) ERC721Royalty() Ownable() ERC721(tokenName_, tokenSymbol_) VRFConsumerBaseV2(vrfCoordinator_) {
        signatureAddress = signatureAddress_;
        __baseURI = baseURI_;
        _contractURI = contractURI_;
        _vrfCoordinator = vrfCoordinator_;
        ticketsPerWallet = ticketsPerWallet_;
        _chainLinkSubscriptionId = chainLinkSubscriptionId_;

        _setDefaultRoyalty(owner(), _royaltyPercentageBasisPoints);
    }


    /*
    * The total supply consisting of the premint + private auction + public auction tokens
    */
    function totalSupply() public view returns(uint256) {
        return preMintCount + privateAuctionTicketCount + publicAuctionTicketCount;
    }

    /*
    * Adds the given addresses to the whitelist for the private auction
    */
    function whitelist(address[] memory addresses) public onlyOwner {
        for (uint256 i = 0; i < addresses.length; ++i) {
            _whitelistMap[addresses[i]] = true;
        }
    }

    /*
    * Removes the given addresses from the whitelist for the private auction
    */
    function unWhitelist(address[] memory addresses) public onlyOwner {
        for (uint256 i = 0; i < addresses.length; ++i) {
            delete _whitelistMap[addresses[i]];
        }
    }

    function whitelisted() public view returns (bool) {
        return _whitelistMap[_msgSender()];
    }

    function tickets() public view returns (uint256) {
        return privateAuctionTicketMap[_msgSender()] + publicAuctionTicketMap[_msgSender()];
    }

    /*
    * Starts the public auction with a specific price and supply. This method may not be called once the auction has been started.
    */
    function startPrivateAuction(uint256 price_, uint256 supply_) public onlyOwner {
        require(!privateAuctionActive(), "Private auction has already been started");
        privateAuctionPrice = price_;
        privateAuctionTicketSupply = supply_;
        privateAuctionStarted = true;
    }

    /*
    * Returns true if the private auction has been started and not yet stopped. false otherwise
    */
    function privateAuctionActive() public view returns (bool) {
        return privateAuctionStarted && !privateAuctionStopped && privateAuctionTicketCount < privateAuctionTicketSupply;
    }

    /*
    * Buy (value/price) tokens while the private auction is active
    * Only whitelisted addresses may use this method
    */
    function buyPrivateAuction(bytes memory signature) public payable {
        // Basic check
        require(privateAuctionActive(), "Private auction is not active");

        // Whitelist check
        require(_whitelistMap[_msgSender()], "Wallet is not whitelisted");

        // Signature check
        bytes32 hash = keccak256(abi.encode(_msgSender(), msg.value, "private")).toEthSignedMessageHash();
        require(hash.recover(signature) == signatureAddress, "Invalid signature");

        // Value check
        require(msg.value > 0, "Value has to be greater than 0");
        require(msg.value % privateAuctionPrice == 0, "Value has to be a multiple of the price");

        uint256 ticketsToBuy = msg.value / privateAuctionPrice;
        uint256 currentTickets = privateAuctionTicketMap[_msgSender()];

        // Ticket amount check
        require(ticketsToBuy + currentTickets <= ticketsPerWallet, "Total ticket count is higher than the max allowed tickets per wallet for the private auction");
        require(privateAuctionTicketCount + ticketsToBuy <= privateAuctionTicketSupply, "There are not enough tickets left in the private auction");

        privateAuctionTicketCount += ticketsToBuy;
        privateAuctionTicketMap[_msgSender()] += ticketsToBuy;
        if (currentTickets == 0) {
            _ticketHolders.push(_msgSender());
        }
    }

    function privateTickets() public view returns (uint256) {
        return privateAuctionTicketMap[_msgSender()];
    }

    /*
    * Stops the private auction. May only be called if the private auction is active.
    */
    function stopPrivateAuction() public onlyOwner {
        require(privateAuctionStarted, "Private auction has not been started");
        privateAuctionStopped = true;
    }

    /*
    * Starts the public auction with a specific price and supply. This method may not be called once the auction has been started.
    */
    function startPublicAuction(uint256 price_, uint256 supply_) public onlyOwner {
        require(!publicAuctionActive(), "Public auction has already been started");
        require(privateAuctionStarted, "Public auction must start after private auction");
        require(!privateAuctionActive(), "Private auction is still active");
        publicAuctionStarted = true;
        publicAuctionPrice = price_;
        publicAuctionTicketSupply = supply_;
    }

    /*
    * Returns true if the public auction has been started and not yet stopped. false otherwise
    */
    function publicAuctionActive() public view returns (bool) {
        return publicAuctionStarted && !publicAuctionStopped  && publicAuctionTicketCount < publicAuctionTicketSupply;
    }

    /*
    * Buy (value/price) tokens while the public auction is active
    */
    function buyPublicAuction(bytes memory signature) public payable {
        // Basic check
        require(publicAuctionActive(), "Public auction is not active");

        // Signature check
        bytes32 hash = keccak256(abi.encode(_msgSender(), msg.value, "public")).toEthSignedMessageHash();
        require(hash.recover(signature) == signatureAddress, "Invalid signature");

        // Value check
        require(msg.value > 0, "Value has to be greater than 0");
        require(msg.value % publicAuctionPrice == 0, "Value has to be a multiple of the price");


        uint256 ticketsToBuy = msg.value / publicAuctionPrice;
        uint256 currentTickets = publicAuctionTicketMap[_msgSender()];

        // Ticket amount check
        require(ticketsToBuy + currentTickets <= ticketsPerWallet, "Total ticket count is higher than the max allowed tickets per wallet for the public auction");
        require(publicAuctionTicketCount + ticketsToBuy <= publicAuctionTicketSupply, "There are not enough tickets left in the public auction");

        publicAuctionTicketCount += ticketsToBuy;
        publicAuctionTicketMap[_msgSender()] += ticketsToBuy;
        if (currentTickets == 0 && privateAuctionTicketMap[_msgSender()] == 0) {
            _ticketHolders.push(_msgSender());
        }
    }

    function publicTickets() public view returns (uint256) {
        return publicAuctionTicketMap[_msgSender()];
    }

    /*
    * Stops the public auction
    */
    function stopPublicAuction() public onlyOwner {
        require(publicAuctionStarted, "Public auction has not been started");
        publicAuctionStopped = true;
    }

    /*
    * Mint a specific amount of tokens before the auction starts. The tokens will be minted on the owners wallet.
    * Can be used to active the collection an a marketplace, like openseas.
    */
    function preMint(uint256 count) public onlyOwner {
        for (uint256 i; i < count; ++i) {
            _safeMint(owner(), _tokenCounter.current());
            _tokenCounter.increment();
        }
        preMintCount = _tokenCounter.current();
    }

    uint256 private _holderIndex;
    uint256 private _nextHolderTokenIndex;

    /*
    * Mint n tokens
    */
    function mintAndDistribute(uint256 count_) public onlyOwner {
        uint256 localIndex = _tokenCounter.current();
        uint256 localHolderIndex = _holderIndex;
        uint256 localNextHolderTokenIndex = _nextHolderTokenIndex;

        uint256 localEnd = localIndex + count_;
        uint256 localTotal = totalSupply();
        if (localEnd > localTotal) {
            localEnd = localTotal;
        }

        require(_tokenCounter.current() < localEnd, "All tokens have been minted");

        address localHolder = _ticketHolders[localHolderIndex];
        uint256 localTotalTickets = privateAuctionTicketMap[localHolder] + publicAuctionTicketMap[localHolder];

        while(_tokenCounter.current() < localEnd) {
            if (localNextHolderTokenIndex >= localTotalTickets) {
                localNextHolderTokenIndex = 0;
                localHolder = _ticketHolders[++localHolderIndex];
                localTotalTickets = privateAuctionTicketMap[localHolder] + publicAuctionTicketMap[localHolder];
            }

            _safeMint(localHolder, _tokenCounter.current());
            localNextHolderTokenIndex++;
            _tokenCounter.increment();
        }
        _nextHolderTokenIndex = localNextHolderTokenIndex;
        _holderIndex = localHolderIndex;
    }

    /*
    * Requests randomness from the oracle
    */
    function requestReveal(string memory realURI_) public onlyOwner {
        VRFCoordinatorV2Interface(_vrfCoordinator).requestRandomWords(
            keyHash,
            _chainLinkSubscriptionId,
            3,
            100000,
            1
        );
        __realURI = realURI_;
    }

    function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override {
        reveal(randomWords[0]);
    }

    /*
    * Reveals the real metadata of the token
    */
    function reveal(uint256 seed_) private {
        __seed = seed_;
        revealed = true;
    }

    /*
    * Withdraw all the ETH stored inside the contract
    */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "The contract contains no ETH to withdraw");
        payable(_msgSender()).transfer(address(this).balance);
    }

    /*
    * Stakes the defined token
    * The token will be transferred to the contract until un-staked
    */
    function stake(uint256 tokenId_) public {
        require(revealed, "Tokens have not been revealed");
        require(_stakeStartTimeMap[tokenId_] == 0, "Token has already been staked");
        require(_stakeLevelTimeMap[tokenId_] == 0, "Token has already been staked beyond level 0");
        require(ownerOf(tokenId_) == _msgSender(), "This token does not belong to the sender wallet");

        _stakeOwnerMap[tokenId_] = _msgSender();
        _stakeStartTimeMap[tokenId_] = block.timestamp;

        transferFrom(_msgSender(), address(this), tokenId_);
    }

    function staked(uint256 tokenId_) public view returns (bool) {
        return _stakeStartTimeMap[tokenId_] != 0;
    }

    /*
    * Unlocks a token. This will unlock the token for trading and set the stake level for this token.
    */
    function unStake(uint256 tokenId_) public {
        require(revealed, "Tokens have not been revealed");
        require(_stakeOwnerMap[tokenId_] == _msgSender(), "Token does not belong to the sender wallet");
        require(_stakeStartTimeMap[tokenId_] != 0, "Token has not been staked");

        uint256 time = block.timestamp - _stakeStartTimeMap[tokenId_];
        if (_definedStakeLevels[0] <= time) {
            _stakeLevelTimeMap[tokenId_] = time;
        }
        _stakeStartTimeMap[tokenId_] = 0;

        _transfer(address(this), _msgSender(), tokenId_);
    }

    /*
    * Returns the stake level for the given token
    */
    function stakeLevel(uint256 token) public view returns (uint256) {
        uint256 stakeTime = _stakeLevelTimeMap[token];
        if (stakeTime == 0 && _stakeStartTimeMap[token] > 0) {
            stakeTime = block.timestamp - _stakeStartTimeMap[token];
        }

        uint256 level = 0;
        for (uint256 i = 0; i < _definedStakeLevels.length; ++i) {
            if (_definedStakeLevels[i] < stakeTime) {
                break;
            }
            level = i + 1;
        }
        return level;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory){
        if (!revealed) return __baseURI;
        uint256 level = stakeLevel(tokenId);
        return string.concat(__realURI, '/meta_', tokenId.toString(), '_', level.toString() , '.json');
    }

    /*
    * Defines the stake level for a given duration
    */
    function defineStakeLevels(uint256[] memory levelTimes) public onlyOwner {
        _definedStakeLevels = levelTimes;
    }

    function getRaribleV2Royalties(uint256) external view returns (LibPart.Part[] memory) {
        LibPart.Part[] memory royalties = new LibPart.Part[](1);
        royalties[0].value = _royaltyPercentageBasisPoints;
        royalties[0].account = payable(owner());
        return royalties;
    }

    /*
       compatibility functions
    */
    // No burning allowed
    function _burn(uint256 tokenId) internal override(ERC721, ERC721Royalty) {}

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Royalty) returns (bool) {
        if (interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) return true;
        return super.supportsInterface(interfaceId);
    }

}