import 'dotenv/config';
import {Contract} from 'ethers';
import {ethers} from 'hardhat';
import {mineBlocks, setBalance} from '../test/helper';
import contractData from '../artifacts/contracts/Auction.sol/Auction.json';

async function main() {
    const [signer] = await ethers.getSigners();
    const contract = new Contract('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', contractData.abi, signer);
    await contract.addToWhitelist(['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266']);


    await setBalance('0x0C2D5Ae3508F9e42539b4A6A013a358d02e182a6', ethers.utils.parseEther('10000'));
    await setBalance('0x3b00de7ba3E2D64f2811A55C33457f1431df6462', ethers.utils.parseEther('10000'));
    await setBalance('0x0e4Aa8BF3131675202171bA7527ab8Ef34435595', ethers.utils.parseEther('10000'));
    await mineBlocks(1);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
