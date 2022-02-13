/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "hardhat/console.sol";

/// @title 3 Phase auction and minting for the latespot NFT project
contract Auction is ERC721Upgradeable, ERC721URIStorageUpgradeable, ERC721EnumerableUpgradeable, OwnableUpgradeable {
    using MathUpgradeable for uint;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    using ECDSAUpgradeable for bytes32;
    using ECDSAUpgradeable for bytes;

    struct PhaseData {
        bool active;
        uint256 ticketSupply;
        uint256 ticketCount;
        uint8 ticketsPerWallet;
        mapping(address => uint8) ticketMap;
    }

    /*
        Initialisation
    */
    uint256 public totalTicketSupply;
    address public signatureAddress;
    address[] private _ticketHolders;
    mapping(address => uint8) private _ticketHolderMap;
    mapping(address => bool) private _whitelistMap;

    function initialize(string memory tokenName_, string memory tokenSymbol_, uint256 totalTicketSupply_, address signatureAddress_, address[] memory whitelistArray_) public initializer {
        __ERC721_init(tokenName_, tokenSymbol_);
        __ERC721URIStorage_init();
        __Ownable_init();

        totalTicketSupply = totalTicketSupply_;
        signatureAddress = signatureAddress_;

        uint256 whitelistLength = whitelistArray_.length;
        for (uint256 i = 0; i < whitelistLength; ++i) {
            _whitelistMap[whitelistArray_[i]] = true;
        }
    }

    /*
        Phase 1 - Public sale
        The public sale consists of a dutch auction where the price is being lowered in set intervals
        until a floor price has been reached
    */
    PhaseData public phaseOneData;
    uint256 public phaseOneStartPrice;
    uint256 public phaseOnePriceStep;
    uint256 public phaseOneBlocksPerStep;
    uint256 public phaseOneFloorPrice;
    uint256 public phaseOneStartBlock;
    uint256 private _phaseOneMaxReduction;

    mapping(address => uint8) private _phaseOneTickets;

    function startPhaseOne(uint256 startPrice_, uint256 priceStep_, uint256 blocksPerStep_, uint256 floorPrice_, uint8 ticketsPerWallet_, uint256 ticketSupply_) public onlyOwner {
        phaseOneData.active = true;
        phaseOneData.ticketSupply = ticketSupply_;
        phaseOneData.ticketsPerWallet = ticketsPerWallet_;

        phaseOneStartPrice = startPrice_;
        phaseOnePriceStep = priceStep_;
        phaseOneBlocksPerStep = blocksPerStep_;
        phaseOneFloorPrice = floorPrice_;
        phaseOneStartBlock = block.number;

        _phaseOneMaxReduction = startPrice_ - floorPrice_;
    }

    function blockPricePhaseOne(uint256 block) internal view returns (uint256) {
        if (!isActivePhase(phaseOneData)) return phaseOneStartPrice;
        uint256 elapsed = block - phaseOneStartBlock;
        uint256 reduction = (elapsed / phaseOneBlocksPerStep) * phaseOnePriceStep;
        if (reduction > _phaseOneMaxReduction) return phaseOneFloorPrice;
        return phaseOneStartPrice - reduction;
    }

    function nextBlockPricePhaseOne() public view returns (uint256) {
        return blockPricePhaseOne(block.number + 1);
    }

    function buyPhaseOne(bytes memory signature) public payable {
        _buy(signature, 1, blockPricePhaseOne(block.number), phaseOneData);
    }


    /*
        Phase 2 - Whitelisted sale
        The whitelisted sale is a fixed price sale, where only whitelisted wallets are allowed to participate
    */
    PhaseData public phaseTwoData;
    uint256 public phaseTwoPrice;

    mapping(address => uint8) private _phaseTwoTickets;

    function startPhaseTwo(uint256 price_, uint256 ticketSupply_, uint8 ticketsPerWallet_) public onlyOwner {
        phaseOneData.active = false;

        phaseTwoData.active = true;
        phaseTwoData.ticketSupply = ticketSupply_;
        phaseTwoData.ticketsPerWallet = ticketsPerWallet_;

        phaseTwoPrice = price_;
    }

    function buyPhaseTwo(bytes memory signature) public payable {
        require(_whitelistMap[_msgSender()], "Address is not whitelisted");
        _buy(signature, 2, phaseTwoPrice, phaseTwoData);
    }

    function stopPhaseTwo() public onlyOwner {
        phaseTwoData.active = false;
    }

    /*
        Phase 3 - Clearance sale
        The clearance sale only happens if there are tickets remaining after phase 2
    */


    PhaseData public phaseThreeData;
    uint256 public phaseThreePrice;

    mapping(address => uint8) private _phaseThreeTickets;

    function startPhaseThree(uint256 price_, uint8 ticketsPerWallet_) public onlyOwner {
        phaseThreeData.active = true;
        phaseThreeData.ticketSupply = totalTicketSupply - phaseOneData.ticketCount - phaseTwoData.ticketCount;
        phaseThreeData.ticketsPerWallet = ticketsPerWallet_;
    }

    function buyPhaseThree(bytes memory signature) public payable {
        _buy(signature, 3, phaseThreePrice, phaseThreeData);
    }

    /*
        General Functions
    */
    function currentPhase() public view returns (uint8) {
        if (isActivePhase(phaseOneData)) return 1;
        if (isActivePhase(phaseTwoData)) return 2;
        if (isActivePhase(phaseThreeData)) return 3;
        return 0;
    }

    function isActivePhase(PhaseData storage data) internal view returns (bool) {
        return data.active && data.ticketCount < data.ticketSupply;
    }

    function whitelisted() public view returns (bool) {
        return _whitelistMap[_msgSender()];
    }

    function getTickets() public view returns (uint8) {
        return _ticketHolderMap[_msgSender()];
    }

    function _buy(bytes memory signature, uint8 phase_, uint256 phasePrice_, PhaseData storage data_) internal {
        // Basic phase check and ticket check
        require(data_.active, "Phase is not active");
        require(data_.ticketCount < data_.ticketSupply, "No tickets left for sale in the current phase");
        require(data_.ticketMap[_msgSender()] < data_.ticketsPerWallet, "Maximum tickets already reached for this wallet for current phase");

        // Signature check
        bytes32 hash = keccak256(abi.encode(_msgSender(), msg.value, phase_)).toEthSignedMessageHash();
        require(hash.recover(signature) == signatureAddress, "Invalid signature");

        // Value check
        require(msg.value > 0, "Value has to be greater than 0");
        require(msg.value % phasePrice_ == 0, "Value has to be a multiple of the price for the current block");


        uint256 ticketsToBuy = msg.value / phasePrice_;
        uint256 currentTickets = data_.ticketMap[_msgSender()];

        // Ticket amount check
        require(ticketsToBuy + currentTickets <= data_.ticketsPerWallet, "Total ticket count is higher than the max allowed tickets per wallet");
        require(data_.ticketCount + ticketsToBuy <= data_.ticketSupply, "There are not enough tickets left in phase one");

        uint8 newTicketCount = uint8(ticketsToBuy + currentTickets);

        data_.ticketCount += ticketsToBuy;
        _ticketHolderMap[_msgSender()] += uint8(ticketsToBuy);
        data_.ticketMap[_msgSender()] = newTicketCount;
        if (currentTickets == 0) {
            _ticketHolders.push(_msgSender());
        }
    }

    /*
        Owner Functions
    */
    function mintAndDistribute() public onlyOwner {
        // TODO: Implement
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        console.log("%s is withdrawing %d wei", _msgSender(), balance);
        console.log("owner is %s", owner());
        require(balance > 0, "The contract contains no ETH to withdraw");
        payable(_msgSender()).transfer(address(this).balance);
    }

    /*
        ERC721Enumerable and ERC721URIStorage compatibility functions
    */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory){
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (bool){
        return super.supportsInterface(interfaceId);
    }
}