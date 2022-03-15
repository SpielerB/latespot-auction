// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import {ethers, network, upgrades} from 'hardhat';
import fetch from 'node-fetch';
import {BigNumber, ContractReceipt} from 'ethers';
import {setBalance} from '../test/helper';

async function main() {
    console.log(`Deploying contracts on network '${network.name}'`)
    const {price} = (await (await fetch('https://api.binance.com/api/v3/avgPrice?symbol=ETHBUSD')).json()) as any;
    await setBalance((await ethers.getSigners())[0].address, ethers.utils.parseEther('100000'));
    const gasPrice = BigNumber.from(10).pow(9).mul(24);
    console.log(`Current ETH price: ${price} BUSD`)
    const factory = await ethers.getContractFactory('Auction');
    let contract = await upgrades.deployProxy(factory, ['Late SpotNFT', 'LSNFT', 10000, '0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199', []]);

    const tx = await contract.deployTransaction.wait();
    const gasCost = ethers.utils.formatEther(`${tx.gasUsed.mul(gasPrice)}`);
    console.log(`Contract deployed to ${contract.address}. (Costs ${gasCost} ETH or ${(+gasCost * price).toFixed(2)} BUSD)`);

    for (let i = 0; i < 20; ++i) {
        const tr: ContractReceipt = await (await contract.mintAndDistribute(500)).wait();
        const cost = +ethers.utils.formatEther(tr.gasUsed.mul(gasPrice));
        console.log(`Minting ${i} costed ${cost} ETH in gas fees (${tr.gasUsed} gas) resulting in a factor of ${cost / (i * 500)}`);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
