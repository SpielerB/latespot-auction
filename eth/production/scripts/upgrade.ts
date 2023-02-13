import "./helper/productionScript"
import {ensureEnv, getOwner, verify} from './helper/productionScript';
// @ts-ignore
import {ethers, upgrades} from 'hardhat';
import {confirmation} from './helper/question';

async function main() {
    const proxyAddress = ensureEnv("UPGRADE_PROXY_ADDRESS");
    const owner = getOwner();
    const crossmintWallet = ensureEnv("UPGRADE_CONTRACT_PARAMETER_CROSSMINT_WALLET");
    const royaltiesWallet = ensureEnv("UPGRADE_CONTRACT_PARAMETER_ROYALTIES_WALLET");
    await confirmation(
        "You are about to upgrade an existing AuctionV2Upgradeable contract to V3 with the following parameters:",
        `\tproxyAddress => ${proxyAddress}`,
        `\tcrossmintWallet => ${crossmintWallet}`,
        `\troyaltiesWallet => ${royaltiesWallet}`,
    );

    const factory = await ethers.getContractFactory("AuctionV3Upgradeable", owner);
    console.info("Upgrading contract...")
    const upgradedProxyContract = await upgrades.upgradeProxy(proxyAddress, factory);

    console.info("Initializing AuctionV3Upgradeable...");
    await upgradedProxyContract.initializeV3(crossmintWallet, royaltiesWallet);

    console.info("Waiting for confirmation...")
    await upgradedProxyContract.deployTransaction.wait(6);

    console.info("Contract has been upgraded to V3.")

    await verify(upgradedProxyContract);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
