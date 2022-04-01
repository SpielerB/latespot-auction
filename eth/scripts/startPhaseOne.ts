import 'dotenv/config';
import {Contract, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import contractData from '../artifacts/contracts/Auction.sol/Auction.json';

async function main() {
    // const [signer] = await ethers.getSigners();
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract('0x1458203959F9E990e80c7F9962035846e7CfA725', contractData.abi, signer);
    // startPrice, reductionPerStep, blocksPerStep, floorPrice, ticketsPerWallet, phaseTicketSupply
    await contract.startPhaseOne(ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.001'), 1000, ethers.utils.parseEther('0.001'), 5, 5);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
