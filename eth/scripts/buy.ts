import 'dotenv/config';
import {BigNumber, Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import {abi, address} from './contract/AuctionV2Upgradeable.json'
import question from '../utils/question';
import {createSignature} from '../test/helper';

async function main() {
    const signer = new Wallet(process.env.SIGNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, abi, signer);
    const privateAuction = await contract.privateAuctionActive();
    const publicAuction = await contract.publicAuctionActive();

    if (!privateAuction && !publicAuction) {
        console.error("No active auction");
        return;
    }

    const wallets = await ethers.getSigners();
    console.log("Searching for available wallets")
    let i = 0;
    const availableWallets = [];
    for (const wallet of wallets) {
        const walletContract = contract.connect(wallet);
        if (publicAuction || await walletContract.whitelisted()) {
            availableWallets[i] = walletContract;
            console.log(`${i}: ${wallets[i].address}`);
            ++i;
        }
    }
    if (availableWallets.length === 0) {
        console.error("No wallets available. Make sure you have whitelisted at least one of the hardhat wallets (see npx hardhat accounts).");
        return;
    }
    console.log()
    console.log("Select wallet index to buy tokens for:")
    const walletIndex = await question(">");
    console.log("Select amount of tokens:")
    const tokenCount = await question(">");

    const walletContract = availableWallets[+walletIndex];
    const walletAddress = await walletContract.signer.getAddress();

    if (privateAuction) {
        const price = await walletContract.privateAuctionPrice() as BigNumber;
        const value = price.mul(+tokenCount);

        console.log(`${walletAddress} buys ${tokenCount} tokens in the private auction for ${ethers.utils.formatEther(value)} ETH`);
        await walletContract.buyPrivateAuction(createSignature(walletAddress, value, "private", signer), {value});
    } else {
        const price = await walletContract.publicAuctionPrice();
        const value = price.mul(+tokenCount);

        console.log(`${walletAddress} buys ${tokenCount} tokens in the public auction for ${ethers.utils.formatEther(value)} ETH`)
        await walletContract.buyPrivateAuction(createSignature(walletAddress, value, "private", signer), {value});
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
