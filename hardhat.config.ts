import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import {task} from 'hardhat/config';

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address, await account.getBalance())
  }
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  defaultNetwork: 'hardhat',
  networks: {
	  hardhat: {

      }
  },
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    root: './eth'
  },
  mocha: {
    timeout: 40000,
    slow: 0, // Set to 0 to display all the timings
    require: 'mocha-suppress-logs'
  }
};
