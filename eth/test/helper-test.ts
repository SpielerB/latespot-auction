import {ethers, network} from 'hardhat';
import {expect} from 'chai';
import {getBalance, setBalance} from './helper';

describe('Helper', function () {
    describe('getBalance', function () {

        it('Should set the correct Balance', async () => {
            const [wallet] = await ethers.getSigners();
            const newBalance = ethers.utils.parseEther('150');
            await setBalance(wallet.address, newBalance);

            expect(await wallet.getBalance()).to.equal(newBalance);
        });

    });
    describe('getBalance', function () {

        it('Should get correct Balance', async () => {
            const [wallet] = await ethers.getSigners();
            const newBalance = ethers.utils.parseEther('150');
            await network.provider.send('hardhat_setBalance', [
                wallet.address,
                ethers.utils.hexValue(newBalance),
            ]);

            expect(await getBalance(wallet.address)).to.equal(newBalance);
        });

    });
});