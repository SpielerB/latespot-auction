/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./@chainlink/VRFV2WrapperConsumerBaseUpgradeable.sol";

/// @title Upgradeable 2 Phase mint for the squirrel degens NFT project (V3)
contract AuctionV3Upgradeable is ERC721Upgradeable, OwnableUpgradeable, VRFV2WrapperConsumerBaseUpgradeable {
    using MathUpgradeable for uint;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    using ECDSAUpgradeable for bytes32;
    using ECDSAUpgradeable for bytes;

    using StringsUpgradeable for uint256;

    /*
        Constants
    */
    uint32 constant callbackGasLimit = 100000;
    uint16 constant requestConfirmations = 3;
    uint32 constant numWords = 1;

    /*
        Initialisation
    */
    CountersUpgradeable.Counter private _tokenCounter; // Used to track new and existing (from V2) tokens
    uint256 public preMintCount;

    address public signatureAddress;

    string private __baseURI;
    string private __realURI;
    string private _contractURI;

    mapping(address => bool) private _whitelistMap;

    /*
        Staking
    */
    event TokenStaked(address indexed _owner, uint256 indexed _token);
    event TokenUnStaked(address indexed _owner, uint256 indexed _token);

    uint256[] private _definedStakeLevels;
    mapping(uint256 => address) private _stakeOwnerMap;
    mapping(uint256 => uint256) private _stakeLevelTimeMap;
    mapping(uint256 => uint256) private _stakeStartTimeMap;

    /*
        Auction
    */
    address[] private _ticketHolders;

    event PrivateMintStarted(uint256 _price, uint256 _supply, uint256 _tokensPerWallet);

    bool public privateAuctionStarted;
    bool public privateAuctionStopped;
    uint256 public privateAuctionPrice;
    uint256 public privateAuctionTicketCount;
    uint256 public privateAuctionTicketSupply;
    uint256 public privateAuctionTicketsPerWallet;
    mapping(address => uint256) public privateAuctionTicketMap;

    event PublicMintStarted(uint256 _price, uint256 _supply, uint256 _tokensPerWallet);

    bool public publicAuctionStarted;
    bool public publicAuctionStopped;
    uint256 public publicAuctionPrice;
    uint256 public publicAuctionTicketCount;
    uint256 public publicAuctionTicketSupply;
    uint256 public publicAuctionTicketsPerWallet;
    mapping(address => uint256) public publicAuctionTicketMap;

    /*
        MintV2
    */
    uint256 private _holderIndex;
    uint256 private _nextHolderTokenIndex;

    /*
        Reveal
    */

    event Revealed(string _uri, uint256 _seed);

    uint256 public revealVrfRequestId;
    bool public revealed;
    uint256 public seed;

    function initialize(string memory tokenName_, string memory tokenSymbol_, address signatureAddress_, string memory baseURI_, string memory contractURI_, address vrfLink_, address vrfWrapper_) public initializer {
        __ERC721_init(tokenName_, tokenSymbol_);
        __Ownable_init();
        __VRFV2WrapperConsumerBase_init(vrfLink_, vrfWrapper_);

        signatureAddress = signatureAddress_;
        __baseURI = baseURI_;
        _contractURI = contractURI_;
    }

    /*
       Private Mint
    */
    bool public privateMintStarted;
    bool public privateMintStopped;
    uint256 public privateMintPrice;
    uint256 public privateMintSupply;
    uint256 public privateMintTokensPerWallet;
    mapping(address => uint256) public privateMintMap;
    CountersUpgradeable.Counter private _privateMintTokenCounter;

    /*
       Public Mint
    */
    bool public publicMintStarted;
    bool public publicMintStopped;
    uint256 public publicMintPrice;
    uint256 public publicMintSupply;
    uint256 public publicMintTokensPerWallet;
    mapping(address => uint256) public publicMintMap;
    CountersUpgradeable.Counter private _publicMintTokenCounter;

    /*
    * Returns the contract URI for the contract level metadata
    */
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    /*
    * The total supply minted
    */
    function totalSupply() public view returns (uint256) {
        return _tokenCounter.current();
    }

    /*
    * Adds the given addresses to the whitelist for the private mint
    */
    function whitelist(address[] memory addresses) public onlyOwner {
        for (uint256 i = 0; i < addresses.length; ++i) {
            _whitelistMap[addresses[i]] = true;
        }
    }

    /*
    * Returns a boolean indicating whether the sender wallet is whitelisted
    */
    function whitelisted() public view returns (bool) {
        return _whitelistMap[_msgSender()];
    }

    /*
    * Returns a boolean indicating whether the sender wallet is whitelisted
    */
    function whitelistedWallet(address wallet) public view onlyOwner returns (bool) {
        return _whitelistMap[wallet];
    }

    /*
    * Returns the amount of tickets bought by the sender wallet in the private auction of the V2 contract
    */
    function privateAuctionTickets() public view returns (uint256) {
        return privateAuctionTicketMap[_msgSender()];
    }

    /*
    * Returns the amount of tickets bought by the given wallet in the private auction of the V2 contract
    */
    function privateAuctionTicketsOf(address wallet) public view onlyOwner returns (uint256) {
        return privateAuctionTicketMap[wallet];
    }

    /*
    * Starts the whitelist mint with a specific price and supply. This method may not be called once the mint has been started.
    */
    function startPrivateMint(uint256 price_, uint256 supply_, uint256 tokensPerWallet_) public onlyOwner {
        require(!privateMintStarted, "Private mint has already been started");
        require(tokensPerWallet_ > 0, "Requires at least 1 token per wallet");
        privateMintPrice = price_;
        privateMintSupply = supply_;
        privateMintStarted = true;
        privateMintTokensPerWallet = tokensPerWallet_;
        emit PrivateMintStarted(price_, supply_, tokensPerWallet_);
    }

    /*
    * Returns true if the private mint has been started and not yet stopped. false otherwise
    */
    function privateMintActive() public view returns (bool) {
        return privateMintStarted && !privateMintStopped && _privateMintTokenCounter.current() < privateMintSupply;
    }

    /*
    * Mint tokens while the private mint is active
    * Only whitelisted addresses may use this method
    */
    function privateMint(bytes memory signature) public payable {
        // Basic check
        require(privateMintActive(), "Private mint is not active");

        // Whitelist check
        require(_whitelistMap[_msgSender()], "Wallet is not whitelisted");

        // Signature check
        bytes32 hash = keccak256(abi.encode(_msgSender(), msg.value, "private")).toEthSignedMessageHash();
        require(hash.recover(signature) == signatureAddress, "Invalid signature");

        // Value check
        require(msg.value > 0, "Value has to be greater than 0");
        require(msg.value % privateMintPrice == 0, "Value has to be a multiple of the price");

        uint256 tokensToMint = msg.value / privateMintPrice;
        uint256 currentTokens = privateMintMap[_msgSender()];

        // Token amount check
        require(tokensToMint + currentTokens <= privateMintTokensPerWallet, "Total token count is higher than the max allowed tokens per wallet for the private mint");
        require(_privateMintTokenCounter.current() + tokensToMint <= privateMintSupply, "There are not enough tokens left in the private mint");

        privateMintMap[_msgSender()] += tokensToMint;

        for (uint256 i = 0; i < tokensToMint; ++i) {
            _mint(_msgSender(), _tokenCounter.current() + 1);
            _tokenCounter.increment();
            _privateMintTokenCounter.increment();
        }
    }

    /*
    * Returns the amount of tokens minted in the private mint
    */
    function privateMintTokenCount() public view returns (uint256) {
        return _privateMintTokenCounter.current();
    }

    /*
    * Returns the amount of tokens minted by the sender wallet in the private mint
    */
    function privateMintTokens() public view returns (uint256) {
        return privateMintMap[_msgSender()];
    }

    /*
    * Returns the amount of tokens minted by the given wallet in the private mint
    */
    function privateMintTokensOf(address wallet) public view onlyOwner returns (uint256) {
        return privateMintMap[wallet];
    }

    /*
    * Stops the private mint and caps the private mint supply if necessary. May only be called if the private mint is active.
    */
    function stopPrivateMint() public onlyOwner {
        require(privateMintStarted, "Private mint has not been started");
        privateMintStopped = true;
        privateMintSupply = _privateMintTokenCounter.current();
    }

    /*
    * Starts the public mint with a specific price and supply. This method may not be called once the mint has been started.
    */
    function startPublicMint(uint256 price_, uint256 supply_, uint256 tokensPerWallet_) public onlyOwner {
        require(!publicMintActive(), "Public mint has already been started");
        require(privateMintStarted, "Public mint must start after private mint");
        require(!privateMintActive(), "Private mint is still active");
        require(privateMintStopped, "Private mint has to be cleaned up using the stopPrivateMint() function before starting the public mint");
        require(tokensPerWallet_ > 0, "Requires at least 1 token per wallet");

        publicMintStarted = true;
        publicMintPrice = price_;
        publicMintSupply = supply_;
        publicMintTokensPerWallet = tokensPerWallet_;
        emit PublicMintStarted(price_, supply_, tokensPerWallet_);
    }

    /*
    * Returns true if the public mint has been started and not yet stopped. false otherwise
    */
    function publicMintActive() public view returns (bool) {
        return publicMintStarted && !publicMintStopped && _publicMintTokenCounter.current() < publicMintSupply;
    }

    /*
    * Mint tokens while the public mint is active
    */
    function publicMint(bytes memory signature) public payable {
        // Basic check
        require(publicMintActive(), "Public mint is not active");

        // Signature check
        bytes32 hash = keccak256(abi.encode(_msgSender(), msg.value, "public")).toEthSignedMessageHash();
        require(hash.recover(signature) == signatureAddress, "Invalid signature");

        // Value check
        require(msg.value > 0, "Value has to be greater than 0");
        require(msg.value % publicMintPrice == 0, "Value has to be a multiple of the price");

        uint256 tokensToMint = msg.value / publicMintPrice;
        uint256 currentTokens = publicMintMap[_msgSender()];

        // Token amount check
        require(tokensToMint + currentTokens <= publicMintTokensPerWallet, "Total token count is higher than the max allowed tokens per wallet for the public mint");
        require(_publicMintTokenCounter.current() + tokensToMint <= publicMintSupply, "There are not enough tokens left in the public mint");

        publicMintMap[_msgSender()] += tokensToMint;

        for (uint256 i = 0; i < tokensToMint; ++i) {
            _mint(_msgSender(), _tokenCounter.current() + 1);
            _tokenCounter.increment();
            _publicMintTokenCounter.increment();
        }
    }

    /*
    * Returns the amount of tokens minted in the public mint
    */
    function publicMintTokenCount() public view returns (uint256) {
        return _publicMintTokenCounter.current();
    }

    /*
    * Returns the amount of tokens minted by the sender wallet in the public mint
    */
    function publicMintTokens() public view returns (uint256) {
        return publicMintMap[_msgSender()];
    }

    /*
   * Returns the amount of tokens minted by the given wallet in the public mint
   */
    function publicMintTokensOf(address wallet) public view onlyOwner returns (uint256) {
        return publicMintMap[wallet];
    }

    /*
    * Stops the public mint
    */
    function stopPublicMint() public onlyOwner {
        require(publicMintStarted, "Public mint has not been started");
        publicMintStopped = true;
        publicMintSupply = _publicMintTokenCounter.current();
    }

    /*
    * Returns the total of tokens minted by the sender wallet
    */
    function mintedTokenCount() public view returns (uint256) {
        return privateMintTokens() + publicMintTokens();
    }

    /*
    * Returns the total of tokens minted by the given wallet
    */
    function mintedTokenCountOf(address wallet) public view onlyOwner returns (uint256) {
        return privateMintTokensOf(wallet) + publicMintTokensOf(wallet);
    }

    /*
    * Mint a specific amount of tokens. The tokens will be minted on the owners wallet.
    * Can be used to activate the collection on a marketplace, like OpenSeas.
    */
    function preMint(uint256 count) public onlyOwner {
        for (uint256 i = 0; i < count; ++i) {
            _mint(owner(), _tokenCounter.current() + 1);
            _tokenCounter.increment();
        }
        preMintCount = _tokenCounter.current();
    }

    /*
    * Requests randomness from the oracle
    */
    function requestReveal(string memory realURI_) public onlyOwner {
        require(!revealed, "Metadata has already been revealed");
        require(_definedStakeLevels.length > 0, "Tokens may not be revealed until staking levels are defined");

        __realURI = realURI_;
        revealVrfRequestId = requestRandomness(callbackGasLimit, requestConfirmations, numWords);
    }

    /*
    * Will be called by ChainLink with an array containing 1 random word (our seed)
    */
    function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override {
        require(!revealed, "Metadata has already been revealed");
        seed = randomWords[0];
        revealed = true;
        emit Revealed(__realURI, seed);
    }

    /*
    * Withdraw all the ETH stored inside the contract to the owner wallet
    */
    function withdraw() public onlyOwner {
        require(publicMintStopped, "Public mint is still ongoing.");

        uint256 balance = address(this).balance;
        require(balance > 0, "The contract contains no ETH to withdraw");
        payable(_msgSender()).transfer(address(this).balance);
    }

    /*
    * Transfer the LINK of this contract to the owner wallet
    */
    function withdrawLink() public onlyOwner {
        require(publicMintStopped, "Public mint is still ongoing.");

        LinkTokenInterface link = LinkTokenInterface(LINK);
        uint256 balance = link.balanceOf(address(this));
        require(balance > 0, "The contract contains no LINK to withdraw");
        require(link.transfer(msg.sender, balance), "Unable to withdraw LINK");
    }

    /*
    * Returns a boolean indicating if the token is currently staked
    */
    function tokens() public view returns (uint256[] memory) {
        uint256[] memory possibleOwnedTokens = new uint256[](totalSupply());
        uint256 index = 0;
        for (uint256 i = 1; i <= totalSupply(); ++i) {
            if (ownerOf(i) == _msgSender()) {
                possibleOwnedTokens[index++] = i;
            }
        }
        // Copy token ids to correct sized array
        uint256[] memory ownedTokens = new uint256[](index);
        for (uint256 i = 0; i < index; ++i) {
            ownedTokens[i] = possibleOwnedTokens[i];
        }
        return ownedTokens;
    }

    /*
       Compatibility functions
    */
    function _burn(uint256) internal pure override(ERC721Upgradeable) {
        revert("Burning is not allowed");
    }

}