import 'dotenv/config';
import {Contract, ContractTransaction, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import {abi, address} from './contract/AuctionV2Upgradeable.json'

const waitFor = async (tx: Promise<ContractTransaction>) => {
    return (await tx).wait();
}

async function main() {
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract(address, abi, signer);

    const supply = await contract.totalSupply();
    const batchSize = 1000;
    const batches = Math.ceil(supply / batchSize);

    console.log(`Minting ${supply} tokens in ${batches} batches of ${batchSize} tokens`)

    for (let i = 0; i < batches; ++i) {
        await contract.mintAndDistribute(batchSize);
        console.log(`Minted batch #${i + 1}`);
    }
    console.log("Finished minting all tokens")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
