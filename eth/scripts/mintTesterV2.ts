import 'dotenv/config';
import {BigNumber, ContractTransaction} from 'ethers';
import {ethers, network} from 'hardhat';
import {createSignature, deploy, setBalance} from '../test/helper';

const waitFor = async (tx: Promise<ContractTransaction>) => {
    return (await tx).wait();
}

async function main() {
    const [signer, other] = await ethers.getSigners();
    if (network.name === 'hardhat' || network.name === 'hardhatLocal') {
        await setBalance(signer.address, ethers.utils.parseEther('10000000'))
        await setBalance(other.address, ethers.utils.parseEther('10000000'))
    }
    let contract = await deploy('AuctionV2',
        'SQL',
        'BUBLI',
        await signer.getAddress(),
        'https://api.squirrel.trivetia.org/token/0',
        'https://api.squirrel.trivetia.org/contract',
        '0x6168499c0cFfCaCD319c818142124B7A15E857ab',
        1000, 42);

    const tx = await contract.deployTransaction.wait();
    const gasCost = ethers.utils.formatEther(`${tx.effectiveGasPrice.mul(tx.gasUsed)}`);
    console.log(`Contract deployed to ${contract.address}. (Costs ${gasCost} ETH)`);

    await waitFor(contract.whitelist([signer.address]));
    console.log('Whitelisted');

    const privatePrice = ethers.utils.parseEther("1");
    await waitFor(contract.startPrivateAuction(privatePrice, BigNumber.from(2000)));
    console.log('Started private phase');

    await waitFor(contract.buyPrivateAuction(await createSignature(signer.address, privatePrice.mul(1000), 'private', signer), {value: privatePrice.mul(1000)}));
    console.log('Bought private phase');

    await waitFor(contract.stopPrivateAuction());
    console.log('Stopped private phase');

    const publicPrice = ethers.utils.parseEther("1");
    await waitFor(contract.startPublicAuction(publicPrice, BigNumber.from(2000)));
    console.log('Started public phase');

    contract = contract.connect(other);

    await waitFor(contract.buyPublicAuction(await createSignature(await other.getAddress(), publicPrice.mul(1000), 'public', signer), {value: publicPrice.mul(1000)}));
    console.log('Bought public phase');


    contract = contract.connect(signer);

    await waitFor(contract.stopPublicAuction());
    console.log('Stopped public phase');

    console.log(await contract.publicTickets())
    console.log(await contract.privateTickets())

    const count = 1000;
    const txa = await waitFor(contract.mintAndDistribute(count));
    console.log(`Minted ${count} for ${txa.gasUsed.mul('12000000000')} WEI`);


    const txb = await waitFor(contract.mintAndDistribute(count));
    console.log(`Minted ${count} for ${txb.gasUsed.mul('12000000000')} WEI`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });