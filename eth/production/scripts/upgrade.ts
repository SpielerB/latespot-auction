import "./helper/productionScript"
import {ensureEnv, getOwner} from './helper/productionScript';
// @ts-ignore
import {ethers, upgrades} from 'hardhat';
import {confirmation} from './helper/question';

async function main() {
    const proxyAddress = ensureEnv("UPGRADE_PROXY_ADDRESS");
    const owner = getOwner();
    await confirmation("You are about to upgrade an existing AuctionV2Upgradeable contract to V3.");

    const factory = await ethers.getContractFactory("AuctionV3Upgradeable", owner);
    const upgradedProxyContract = await upgrades.upgradeProxy(proxyAddress, factory);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
