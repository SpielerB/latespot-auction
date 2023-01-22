import 'dotenv/config';
import {Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import contractData from '../artifacts/contracts/AuctionV2Upgradeable.sol/AuctionV2Upgradeable.json';
import {address} from './contract/AuctionV2Upgradeable.json'
import question from '../utils/question';

async function main() {
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, contractData.abi, signer);
    const addresses = [];
    let adding = true;
    while (adding) {
        console.log("Enter address to whitelist. Enter 'done' after adding all the addresses to whitelist:")
        const answer = await question("> ");
        if (answer.toLowerCase() === "done") {
            adding = false;
        } else if (answer.startsWith("0x") && answer.length === 42) {
            addresses.push(answer);
            console.log(`${answer} will be whitelisted`)
        } else {
            console.error("Invalid input")
        }
    }
    if (addresses.length === 0) {
        console.error("No addresses were entered")
        return;
    }
    console.log("Whitelisting added addresses")
    await contract.whitelist(addresses);
    console.log(`Addresses have been whitelisted`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
