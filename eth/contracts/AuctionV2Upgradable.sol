/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721RoyaltyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./@rarible/royalties-upgradeable/contracts/RoyaltiesV2Upgradeable.sol";

/// @title 2 Phase auction and minting for the latespot NFT project
contract AuctionV2Upgradeable is ERC721Upgradeable, ERC721RoyaltyUpgradeable, OwnableUpgradeable, RoyaltiesV2Upgradeable {
    using MathUpgradeable for uint;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    using ECDSAUpgradeable for bytes32;
    using ECDSAUpgradeable for bytes;

    /*
        Constants
    */
    uint96 private constant _royaltyPercentageBasisPoints = 1000;
    uint256 public constant ticketsPerWallet = 5;

    /*
        Initialisation
    */
    CountersUpgradeable.Counter private _tokenCounter;
    uint256 public preMintCount;
    uint256 public totalSupply;

    address public signatureAddress;

    string private __baseURI;
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
    CountersUpgradeable.Counter private _ticketCounter;
    mapping(uint256 => address) private _ticketHolderMap;

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
    function DeWhitelist(address[] memory addresses) public onlyOwner {
        for (uint256 i = 0; i < addresses.length; ++i) {
            delete _whitelistMap[addresses[i]];
        }
    }

    function whitelisted() public returns (bool) {
        return _whitelistMap[_msgSender()];
    }

    function tickets() public returns (uint256) {
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
        return privateAuctionStarted && !privateAuctionStopped;
    }

    /*
    * Buy (value/price) tokens while the private auction is active
    * Only whitelisted addresses may use this method
    */
    function buyPrivate(bytes memory signature) public payable {
        // Basic check
        require(privateAuctionActive(), "Private auction is not active");
        require(privateAuctionTicketCount < privateAuctionTicketSupply, "No tickets left for sale in the private auction");

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
        require(privateAuctionTicketCount + ticketsToBuy <= privateAuctionTicketSupply, "There are not enough tickets left the private auction");

        uint256 newTicketCount = uint256(ticketsToBuy + currentTickets);

        privateAuctionTicketCount += ticketsToBuy;
        privateAuctionTicketMap[_msgSender()] += ticketsToBuy;
        for (uint256 i = 0; i < ticketsToBuy; ++i) {
            _ticketHolderMap[_ticketCounter.current()] = _msgSender();
            _ticketCounter.increment();
        }
    }

    function privateTickets() public returns (uint256) {
        return privateAuctionTicketMap[_msgSender()];
    }

    /*
    * Stops the private auction. May only be called if the private auction is active.
    */
    function stopPrivateAuction() public onlyOwner {
        require(privateAuctionActive(), "Private auction is not active");
        privateAuctionStopped = true;
    }

    /*
    * Starts the public auction with a specific price and supply. This method may not be called once the auction has been started.
    */
    function startPublicAuction(uint256 price_, uint256 supply_) public onlyOwner {
        require(!publicAuctionActive(), "Auction has already been started");
        require(!privateAuctionActive(), "Private auction is still active");
        require(!privateAuctionStarted, "Requires private auction to be finished");
        publicAuctionStarted = true;
        publicAuctionPrice = price_;
        publicAuctionTicketSupply = supply_;
    }

    /*
    * Returns true if the public auction has been started and not yet stopped. false otherwise
    */
    function publicAuctionActive() public view returns (bool) {
        return publicAuctionStarted && !publicAuctionStopped;
    }

    /*
    * Buy (value/price) tokens while the public auction is active
    */
    function buyPublic(bytes memory signature) public payable {
        // Basic check
        require(publicAuctionActive(), "Public auction is not active");
        require(publicAuctionTicketCount < publicAuctionTicketSupply, "No tickets left for sale in the public auction");

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
        require(publicAuctionTicketCount + ticketsToBuy <= publicAuctionTicketSupply, "There are not enough tickets left the public auction");

        uint256 newTicketCount = uint256(ticketsToBuy + currentTickets);

        publicAuctionTicketCount += ticketsToBuy;
        publicAuctionTicketMap[_msgSender()] += ticketsToBuy;
        for (uint256 i = 0; i < ticketsToBuy; ++i) {
            _ticketHolderMap[_ticketCounter.current()] = _msgSender();
            _ticketCounter.increment();
        }
    }

    function publicTickets() public returns (uint256) {
        return publicAuctionTicketMap[_msgSender()];
    }

    /*
    * Stops the public auction
    */
    function stopPublicAuction() public onlyOwner {
        require(publicAuctionActive(), "Auction is not running");
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

    /*
    * Mint n tokens
    */
    function mintAndDistribute(uint256 count) public onlyOwner {
        uint256 end = _tokenCounter.current() + count;
        uint256 total = preMintCount + _ticketCounter.current();
        if (end > total) {
            end = total;
        }
        for (uint256 i = _tokenCounter.current(); i < end; _tokenCounter.increment()) {
            _safeMint(owner(), i);
        }
    }

    /*
    * Reveals the tokens by changing the baseURI_ to the correct path
    */
    function reveal(string memory baseURI_) public onlyOwner {
        // TODO: chainlink integration
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
    * Stakes the token
    * The token will be transferred to the contract until un-staked
    */
    function stake(uint256 tokenId_) public {
        require(ownerOf(tokenId_) == _msgSender(), "This token does not belong to the sender wallet");
        require(_stakeStartTimeMap[tokenId_] == 0, "Token has already been staked");

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
        require(_stakeOwnerMap[tokenId_] == _msgSender(), "Token does not belong to the sender wallet");
        require(_stakeStartTimeMap[tokenId_] != 0, "Token has not been staked");

        _stakeLevelTimeMap[tokenId_] = block.timestamp - _stakeStartTimeMap[tokenId_];

        transferFrom(address(this), _msgSender(), tokenId_);
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
            if (_definedStakeLevels[i] > stakeTime) {
                break;
            }
            level = i + 1;
        }
        return level;
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
    function _burn(uint256 tokenId) internal override(ERC721Upgradeable, ERC721RoyaltyUpgradeable) {}

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable, ERC721RoyaltyUpgradeable, ERC165Upgradeable) returns (bool) {
        if (interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) return true;
        return super.supportsInterface(interfaceId);
    }

}