import 'dotenv/config';
import {Contract, ContractTransaction, Wallet} from 'ethers';
import {ethers} from 'hardhat';
import contractData from '../artifacts/contracts/Auction.sol/Auction.json';

const waitFor = async (tx: Promise<ContractTransaction>) => {
    return (await tx).wait();
}

async function main() {
    const signer = new Wallet(process.env.OWNER_PRIVATE_KEY as string, ethers.provider);
    const contract = new Contract('0x1458203959F9E990e80c7F9962035846e7CfA725', contractData.abi, signer);

    await waitFor(contract.reveal('https://api.squirrel.trivetia.org/token/'));
    console.log('Revealed')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
