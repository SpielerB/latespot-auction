import 'dotenv/config';
import {Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import {abi, address} from './contract/AuctionV2Upgradeable.json'
import question from '../utils/question';

async function main() {
    const signer = new Wallet(process.env.SIGNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, abi, signer);

    const wallets = await ethers.getSigners();
    console.log("Searching for available wallets")
    let i = 0;
    const availableWallets = [];
    for (const wallet of wallets) {
        const walletContract = contract.connect(wallet);
        availableWallets[i] = walletContract;
        console.log(`${i}: ${wallets[i].address}`);
        ++i;
    }
    if (availableWallets.length === 0) {
        console.error("No wallets available.");
        return;
    }
    console.log()
    console.log("Select wallet index to see tokens for:")
    const walletIndex = await question(">");

    const walletContract = availableWallets[+walletIndex];
    const ids = await walletContract.tokens();

    for (const id of ids) {
        const tokenURI = await walletContract.tokenURI(id);
        const response = await fetch(tokenURI);
        const staked = await contract.staked(id);
        const stakeTime = await contract.stakeTime(id);
        const stakeLevel = await contract.stakeLevel(id);
        const data = await response.json();
        console.log(staked, stakeTime, stakeLevel, data);
    }
    console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
