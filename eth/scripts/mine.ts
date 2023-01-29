import 'dotenv/config';
import question from '../utils/question';
import {increaseNextBlockTime, mineBlocks} from '../test/helper';

async function main() {
    console.log("How many blocks should be mined:")
    const count = await question(">");
    console.log(`Mining ${count} blocks with 10 second intervals`)
    for (let i = 0; i < +count; ++i) {
        await increaseNextBlockTime(10);
        await mineBlocks(1);
    }
    console.log(`${count} blocks have been mined`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
