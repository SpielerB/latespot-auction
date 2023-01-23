import 'dotenv/config';
import {Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import {abi, address} from './contract/AuctionV2Upgradeable.json'

async function main() {
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, abi, signer);
    // price, supply, ticketsPerWallet
    const bronzeLevelSeconds = 60 * 60 * 24 * 30; // 30 Days
    const silverLevelSeconds = 60 * 60 * 24 * 60; // 60 Days
    const goldLevelSeconds = 60 * 60 * 24 * 180; // 180 Days
    await contract.defineStakeLevels([bronzeLevelSeconds, silverLevelSeconds, goldLevelSeconds]);
    console.log("Stake levels have been defined")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
