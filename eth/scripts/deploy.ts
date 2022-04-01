import 'dotenv/config';
import {Wallet} from 'ethers';
import {ethers, upgrades} from 'hardhat';

async function main() {
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const factory = await ethers.getContractFactory('Auction', signer);
    const contract = await upgrades.deployProxy(factory, ['ltsptoken', 'LTISP', 15, '0x3b00de7ba3E2D64f2811A55C33457f1431df6462', 'https://api.squirrel.trivetia.org/token/'], {});

    await contract.deployed();
    const tx = await contract.deployTransaction.wait();
    const gasCost = ethers.utils.formatEther(`${tx.effectiveGasPrice.mul(tx.gasUsed)}`);
    console.log(`Contract deployed to ${contract.address}. (Costs ${gasCost} ETH)`);

    await (await contract.addToWhitelist(['0x3b00de7ba3E2D64f2811A55C33457f1431df6462'])).wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
