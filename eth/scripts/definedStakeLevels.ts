import 'dotenv/config';
import {Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import {abi, address} from './contract/AuctionV3Upgradeable.json'

async function main() {
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, abi, signer);
    // price, supply, ticketsPerWallet
    const bronzeLevelSeconds = 30; // 30 seconds
    const silverLevelSeconds = 60 * 2; // 2 Minutes
    const goldLevelSeconds = 60 * 4; // 4 Minutes
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
