import 'dotenv/config';
import {Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import contractData from '../artifacts/contracts/AuctionV2.sol/AuctionV2.json';
import {address} from './contract/AuctionV2.json'

async function main() {
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, contractData.abi, signer);
    // price, supply, ticketsPerWallet
    await contract.startPublicAuction(ethers.utils.parseEther('0.001'), 8000, 5);
    console.log("Public auction has been started")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
