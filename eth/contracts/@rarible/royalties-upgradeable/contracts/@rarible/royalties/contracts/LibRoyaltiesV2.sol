// SPDX-License-Identifier: MIT
// Copied and updated solidity Version: https://github.com/rarible/protocol-contracts/blob/master

pragma solidity ^0.8.9;

library LibRoyaltiesV2 {
    /*
     * bytes4(keccak256('getRaribleV2Royalties(uint256)')) == 0xcad96cca
     */
    bytes4 constant _INTERFACE_ID_ROYALTIES = 0xcad96cca;
}