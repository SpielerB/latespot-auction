// SPDX-License-Identifier: MIT
// Copied and updated solidity Version: https://github.com/rarible/protocol-contracts/blob/master

pragma solidity ^0.8.9;
pragma abicoder v2;

import "./LibPart.sol";

interface RoyaltiesV2 {
    event RoyaltiesSet(uint256 tokenId, LibPart.Part[] royalties);

    function getRaribleV2Royalties(uint256 id) external view returns (LibPart.Part[] memory);
}