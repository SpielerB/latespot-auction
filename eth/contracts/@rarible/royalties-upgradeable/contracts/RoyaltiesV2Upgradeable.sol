// SPDX-License-Identifier: MIT
// Copied and updated ERC165Upgradeable.sol path as well as solidity Version: https://github.com/rarible/protocol-contracts/blob/master

pragma solidity ^0.8.9;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "./@rarible/royalties/contracts/LibRoyaltiesV2.sol";
import "./@rarible/royalties/contracts/RoyaltiesV2.sol";

abstract contract RoyaltiesV2Upgradeable is ERC165Upgradeable, RoyaltiesV2 {
    function __RoyaltiesV2Upgradeable_init_unchained() internal initializer {}
}