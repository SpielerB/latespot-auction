import 'dotenv/config';
import question from '../utils/question';
import {setBalance} from '../test/helper';
import {ethers} from 'ethers';

async function main() {
    console.log("Enter address to add funds to:")
    const address = await question(">");
    console.log("Enter amount of to add funds to:")
    const amount = await question(">");
    await setBalance(address, ethers.utils.parseEther(amount))
    console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
