/*
import 'dotenv/config';
import {ContractTransaction, Wallet} from 'ethers';
import {ethers, network, upgrades} from 'hardhat';
import {createSignature, setBalance} from '../test/helper';

const waitFor = async (tx: Promise<ContractTransaction>) => {
    return (await tx).wait();
}

async function main() {
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    if (network.name === 'hardhat' || network.name === 'hardhatLocal') {
        await setBalance(signer.address, ethers.utils.parseEther('1000'))
    }
    const factory = await ethers.getContractFactory('Auction', signer);
    const contract = await upgrades.deployProxy(factory, ['SQL', 'BUBLI', 15, await signer.getAddress(), 'https://api.squirrel.trivetia.org/token/0', 'https://api.squirrel.trivetia.org/contract'], {});

    await contract.deployed();
    const tx = await contract.deployTransaction.wait();
    const gasCost = ethers.utils.formatEther(`${tx.effectiveGasPrice.mul(tx.gasUsed)}`);
    console.log(`Contract deployed to ${contract.address}. (Costs ${gasCost} ETH)`);

    await waitFor(contract.addToWhitelist(['0x3b00de7ba3E2D64f2811A55C33457f1431df6462']));

    const priceOne = ethers.utils.parseEther('0.01');
    await waitFor(contract.startPhaseOne(priceOne, ethers.utils.parseEther('0.001'), 1000, ethers.utils.parseEther('0.001'), 5, 5));
    await waitFor(contract.buyPhaseOne(await createSignature(signer.address, priceOne.mul(5), 1, signer), {value: priceOne.mul(5)}));
    console.log('Finished phase one');

    const priceTwo = ethers.utils.parseEther('0.005');
    await waitFor(contract.startPhaseTwo(priceTwo, 5, 5));
    await waitFor(contract.buyPhaseTwo(await createSignature(signer.address, priceTwo.mul(5), 2, signer), {value: priceTwo.mul(5)}));
    console.log('Finished phase two');

    const priceThree = ethers.utils.parseEther('0.01');
    await waitFor(contract.startPhaseThree(priceThree, 5));
    await waitFor(contract.buyPhaseThree(await createSignature(signer.address, priceThree.mul(5), 3, signer), {value: priceThree.mul(5)}));
    console.log('Finished phase three');

    await waitFor(contract.mintAndDistribute(100));
    console.log('Minted');

    await waitFor(contract.reveal('https://api.squirrel.trivetia.org/token/'));
    console.log('Revealed');

    await waitFor(contract.withdraw());
    console.log('Withdrawn');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

 */