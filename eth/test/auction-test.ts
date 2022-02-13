import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber, BigNumberish, Contract, ContractReceipt, ContractTransaction} from 'ethers';
import {describe} from 'mocha';
import {createSignature, deployProxy, getBalance, mineBlocks, setBalance} from './helper';

interface InitParams {
    tokenName: string;
    tokenSymbol: string;
    tokenSupply: number;
    signer: string;
    whitelist: string[];
}

interface PhaseOneParams {
    startPrice: BigNumber;
    priceStep: BigNumber;
    floorPrice: BigNumber;
    blocksPerPriceStep: number;
    ticketsPerWallet: number;
    ticketSupply: number;
}

interface PhaseTwoParams {
    price: BigNumber;
    ticketsPerWallet: number;
    ticketSupply: number;
}

interface PhaseThreeParams {
    price: BigNumber;
    ticketsPerWallet: number;
}

const phaseOneParams: PhaseOneParams = {
    startPrice: ethers.utils.parseEther('3'),
    priceStep: ethers.utils.parseEther('0.1'),
    floorPrice: ethers.utils.parseEther('0.25'),
    blocksPerPriceStep: 60,
    ticketsPerWallet: 5,
    ticketSupply: 8000
};

const phaseTwoParams: PhaseTwoParams = {
    price: ethers.utils.parseEther('0.4'),
    ticketsPerWallet: 2,
    ticketSupply: 2000
}

const phaseThreeParams: PhaseThreeParams = {
    price: ethers.utils.parseEther('0.25'),
    ticketsPerWallet: 1
}

const deployAuction = async (overrides?: Partial<InitParams>) => {
    const signers = await ethers.getSigners();
    let whitelist = overrides?.whitelist;
    if (whitelist === undefined) {
        const signers = await ethers.getSigners();
        whitelist = signers.filter((_, i) => i % 2 === 0).map(a => a.address);
    }
    return await deployProxy('Auction', overrides?.tokenName || 'LateSpotNFT',
        overrides?.tokenSymbol || 'LSNFT',
        overrides?.tokenSupply || 10000,
        overrides?.signer || signers[signers.length - 1].address,
        overrides?.whitelist || whitelist);
};

describe('Auction Contract', async function () {
    let contract: Contract;
    const whitelistedSigners = (await ethers.getSigners()).filter((_, i) => i % 2 === 0);
    const nonWhitelistedSigners = (await ethers.getSigners()).filter((_, i) => i % 2 === 1);

    const startPhaseOne = async (params?: Partial<PhaseOneParams>) => {
        const tx: ContractTransaction = await contract.startPhaseOne(
            params?.startPrice || phaseOneParams.startPrice,
            params?.priceStep || phaseOneParams.priceStep,
            params?.blocksPerPriceStep || phaseOneParams.blocksPerPriceStep,
            params?.floorPrice || phaseOneParams.floorPrice,
            params?.ticketsPerWallet || phaseOneParams.ticketsPerWallet,
            params?.ticketSupply || phaseOneParams.ticketSupply
        );
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const buyPhaseOne = async (value: BigNumberish, signature?: string) => {
        if (signature === undefined) {
            const address = await contract.signer.getAddress();
            const signatureSigner = await ethers.getSigner(await contract.signatureAddress());
            signature = await createSignature(address, value, 1, signatureSigner);
        }

        const tx: ContractTransaction = await contract.buyPhaseOne(signature, {value});
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const startPhaseTwo = async (params?: Partial<PhaseTwoParams>) => {
        const tx: ContractTransaction = await contract.startPhaseTwo(
            params?.price || phaseTwoParams.price,
            params?.ticketSupply || phaseTwoParams.ticketSupply,
            params?.ticketsPerWallet || phaseTwoParams.ticketsPerWallet
        );
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const buyPhaseTwo = async (value: BigNumberish, signature?: string) => {
        if (signature === undefined) {
            const address = await contract.signer.getAddress();
            const signatureSigner = await ethers.getSigner(await contract.signatureAddress());
            signature = await createSignature(address, value, 2, signatureSigner);
        }

        const tx: ContractTransaction = await contract.buyPhaseTwo(signature, {value});
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const stopPhaseTwo = async () => {
        const tx: ContractTransaction = await contract.stopPhaseTwo();
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const startPhaseThree = async (params?: Partial<PhaseThreeParams>) => {
        const tx: ContractTransaction = await contract.startPhaseThree(
            params?.price || phaseThreeParams.price,
            params?.ticketsPerWallet || phaseThreeParams.ticketsPerWallet
        );
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const buyPhaseThree = async (value: BigNumberish, signature?: string) => {
        if (signature === undefined) {
            const address = await contract.signer.getAddress();
            const signatureSigner = await ethers.getSigner(await contract.signatureAddress());
            signature = await createSignature(address, value, 3, signatureSigner);
        }

        const tx: ContractTransaction = await contract.buyPhaseThree(signature, {value});
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    beforeEach(async () => {
        contract = await deployAuction(); // Redeploy contract for each test to ensure clean state
    })

    describe('Initialize', async () => {

        it('Should have the correct owner', async () => {
            expect(await contract.owner()).to.equal(contract.deployTransaction.from);
        });

        it('Should set the correct total ticket supply', async () => {
            const totalTicketSupply = 12000;
            contract = await deployAuction({tokenSupply: totalTicketSupply});
            expect(await contract.totalTicketSupply()).to.equal(totalTicketSupply);
        });

        it('Should have added the whitelisted addresses', async () => {
            const signers = await ethers.getSigners();
            contract = await deployAuction({whitelist: signers.filter((_, i) => i % 2 == 0).map(s => s.address)});
            for (let i = 0; i < signers.length; ++i) {
                contract = contract.connect(signers[i]);
                const expectIt = expect(await contract.whitelisted());
                if (i % 2 == 0) {
                    expectIt.to.be.true
                } else {
                    expectIt.to.be.false
                }
            }
        });

    });

    describe('General Functions', async () => {
        describe('currentPhase', async () => {

            it('Should return correct value for phase 1 active', async () => {
                await startPhaseOne();
                expect(await contract.currentPhase()).to.equal(1);
            });

            it('Should return correct value for phase 2 active', async () => {
                await startPhaseTwo();
                expect(await contract.currentPhase()).to.equal(2);
            });
            it('Should return correct value for phase 3 active', async () => {
                await startPhaseThree();
                expect(await contract.currentPhase()).to.equal(3);
            });
            it('Should return correct value for no phase active', async () => {
                expect(await contract.currentPhase()).to.equal(0);
            });
            // TODO: Implement
        });
        describe('getTickets', async () => {

            it('Should return correct value', async () => {
                await startPhaseOne();
                await buyPhaseOne(phaseOneParams.startPrice);
                expect(await contract.getTickets()).to.equal(1);
                await buyPhaseOne(phaseOneParams.startPrice.mul(2));
                expect(await contract.getTickets()).to.equal(3);
                // TODO: Add other phases
            });
        })
    }); // TODO: Implement

    describe('Owner Functions', async () => {
        describe('withdraw', function () {

            it('Should allow for the owner to withdraw the balance of the contract', async () => {
                const [owner] = await ethers.getSigners();
                const ownerStartBalance = await owner.getBalance();
                const contractStartBalance = ethers.utils.parseEther('150');
                await setBalance(contract.address, contractStartBalance);

                const tx: ContractReceipt = await (await contract.withdraw()).wait();
                const gasCost = tx.effectiveGasPrice.mul(tx.gasUsed);

                expect(await owner.getBalance()).to.equal(ownerStartBalance.add(contractStartBalance).sub(gasCost));
                expect(await getBalance(contract.address)).to.equal(0);
            });

            it('Should not allow for other wallets than the owner to withdraw the balance of the contract', async () => {
                const [, notOwner] = await ethers.getSigners();
                const contractStartBalance = ethers.utils.parseEther('150');
                await setBalance(contract.address, contractStartBalance);

                contract = contract.connect(notOwner);
                await expect(contract.withdraw()).to.be.revertedWith('Ownable: caller is not the owner');

                await expect(await getBalance(contract.address)).to.equal(contractStartBalance);
            });
        });
        describe('mintAndDistribute', function () {

            it('Should mint the same amount of tokens as the wallet has tickets', async () => {

            });


            it('Should allow for only the owner to mint and distribute', async () => {

            });
        });
    });

    describe('Phase 1 Functions', async () => {

        describe('startPhaseOne', async () => {

            it('Should mark phase 1 as active', async () => {
                await startPhaseOne();
                expect((await contract.phaseOneData()).active).to.equal(true);
            });

            it('Should allow for the owner to start phase 1', async () => {
                expect(startPhaseOne()).to.not.be.revertedWith('Ownable: caller is not the owner');
            });

            it('Should not allow for non owner wallets to start phase 1', async () => {
                const [, notOwner] = await ethers.getSigners();
                contract = contract.connect(notOwner);

                expect(startPhaseOne()).to.be.revertedWith('Ownable: caller is not the owner');
            });

            it('Should set the correct values', async () => {
                const tx = await startPhaseOne();
                const data = await contract.phaseOneData();
                expect(data.active).to.equal(true);
                expect(data.ticketSupply).to.equal(phaseOneParams.ticketSupply);
                expect(data.ticketsPerWallet).to.equal(phaseOneParams.ticketsPerWallet);

                expect(await contract.phaseOneStartPrice()).to.equal(phaseOneParams.startPrice);
                expect(await contract.phaseOnePriceStep()).to.equal(phaseOneParams.priceStep);
                expect(await contract.phaseOneBlocksPerStep()).to.equal(phaseOneParams.blocksPerPriceStep);
                expect(await contract.phaseOneFloorPrice()).to.equal(phaseOneParams.floorPrice);
                expect(await contract.phaseOneStartBlock()).to.equal(tx.blockNumber);
            });
        })
        describe('nextBlockPricePhaseOne', async () => {

            it('Should not decrease the next price before the correct amount of blocks has been mined', async function () {
                await startPhaseOne();

                await mineBlocks(phaseOneParams.blocksPerPriceStep - 2); // Move to one block before the price should increase
                expect(await contract.nextBlockPricePhaseOne(), 'Price should not decrease before the specified block count has been mined').to.equal(phaseOneParams.startPrice);
            });

            it('Should decrease the next price based on the amount of blocks mined', async function () {
                await startPhaseOne();

                let i = 0;
                let expected;
                while ((expected = phaseOneParams.startPrice.sub(phaseOneParams.priceStep.mul(i))).gte(phaseOneParams.floorPrice)) {
                    expect(await contract.nextBlockPricePhaseOne()).to.equal(expected);
                    await mineBlocks(phaseOneParams.blocksPerPriceStep);
                    ++i;
                }
            });

            it(`Should not decrease the current price for phase one after reaching the floor price`, async function () {
                await startPhaseOne();

                const blocks = BigNumber.from(phaseOneParams.blocksPerPriceStep).mul(phaseOneParams.startPrice.sub(phaseOneParams.floorPrice).div(phaseOneParams.priceStep).add(1)); // add(1) to account for the integer part of the price formula
                await mineBlocks(blocks.sub(2)); // Skip blocks to just before the price should go past the floor price
                expect(await contract.nextBlockPricePhaseOne()).to.gte(phaseOneParams.floorPrice);
                await mineBlocks(1); // Skip to the block where the price should go past the floor price
                expect(await contract.nextBlockPricePhaseOne()).to.equal(phaseOneParams.floorPrice);
                await mineBlocks(phaseOneParams.blocksPerPriceStep * 10);
                expect(await contract.nextBlockPricePhaseOne()).to.equal(phaseOneParams.floorPrice);
            });
        });
        describe('buyPhaseOne', async () => {

            it('Should only allow the purchase of tickets if phase 1 has been started', async () => {
                await expect(buyPhaseOne(phaseOneParams.startPrice)).to.be.revertedWith('Phase is not active');
                await startPhaseOne();
                await expect(buyPhaseOne(phaseOneParams.startPrice)).to.not.be.revertedWith('Phase is not active');
            });

            it('Should not allow for more than the max tickets per wallet', async () => {
                await startPhaseOne();
                await expect(buyPhaseOne(phaseOneParams.startPrice.mul(phaseOneParams.ticketsPerWallet + 1))).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet');
            });

            it('Should only allow for payments equal to the current price', async () => {
                await startPhaseOne();
                // Non multiple values
                await expect(buyPhaseOne(phaseOneParams.startPrice.add(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');
                await expect(buyPhaseOne(phaseOneParams.startPrice.mul(2).add(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');
                await expect(buyPhaseOne(phaseOneParams.startPrice.mul(2).add(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');
                await expect(buyPhaseOne(1)).to.be.revertedWith('Value has to be a multiple of the price for the current block');
                await expect(buyPhaseOne(phaseOneParams.startPrice.sub(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');

                // Zero value
                await expect(buyPhaseOne(0)).to.be.revertedWith('Value has to be greater than 0');
            });

            it('Should not allow the purchase of tickets if phase 1 has been sold out', async () => {
                const [, other1, other2] = await ethers.getSigners();
                await startPhaseOne({ticketSupply: 1})

                contract = contract.connect(other1);
                await buyPhaseOne(phaseOneParams.startPrice);

                contract = contract.connect(other2);
                await expect(buyPhaseOne(phaseOneParams.startPrice)).to.be.revertedWith('No tickets left for sale in the current phase');
            });

            for (let i = 1; i <= phaseOneParams.ticketsPerWallet; ++i) {
                it(`Should allow for a wallet to buy ${i} tickets`, async () => {
                    await startPhaseOne();
                    await expect(buyPhaseOne(phaseOneParams.startPrice.mul(i))).to.not.be.revertedWith('');
                    expect(await contract.getTickets()).to.equal(i);
                });
            }

            it(`Should not allow for a wallet to buy more than ${phaseOneParams.ticketsPerWallet} tickets`, async () => {
                await startPhaseOne();
                await expect(buyPhaseOne(phaseOneParams.startPrice.mul(phaseOneParams.ticketsPerWallet + 1))).to.be.revertedWith('');
                expect(await contract.getTickets()).to.equal(0);
            });

            it('Should cost the same gas regardless of the amount of tickets', async () => {
                const [, notOwner1, notOwner2, notOwner3] = await ethers.getSigners();

                const maxDeviation = 20; // The gas cost may vary due to the signature

                await startPhaseOne();
                await buyPhaseOne(phaseOneParams.startPrice);

                contract = contract.connect(notOwner1);
                const tx1 = await buyPhaseOne(phaseOneParams.startPrice);

                contract = contract.connect(notOwner2);
                const tx2 = await buyPhaseOne(phaseOneParams.startPrice.mul(2));

                contract = contract.connect(notOwner3);
                const tx3 = await buyPhaseOne(phaseOneParams.startPrice.mul(5));

                const gas1 = (await tx1.wait()).gasUsed;
                const gas2 = (await tx2.wait()).gasUsed;
                const gas3 = (await tx3.wait()).gasUsed;

                expect(gas1.sub(gas2).abs().lte(maxDeviation)).to.be.true;
                expect(gas1.sub(gas3).abs().lte(maxDeviation)).to.be.true;
                expect(gas2.sub(gas3).abs().lte(maxDeviation)).to.be.true;
            });

            it('Should not allow invalid signatures', async () => {
                const [wrongSigner] = await ethers.getSigners();

                await startPhaseOne();

                // Wrong signer
                const address = await contract.signer.getAddress();
                await expect(buyPhaseOne(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice, 1, wrongSigner))).to.be.revertedWith('Invalid signature');

                // Wrong data
                await expect(buyPhaseOne(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice.mul(2), 1))).to.be.revertedWith('Invalid signature');
            });

        });
    });

    describe('Phase 2 Functions', async () => {
        describe('startPhaseTwo', async () => {

            it('Should mark phase 2 as active', async () => {
                expect((await contract.phaseTwoData()).active).to.be.false;
                await startPhaseTwo();
                expect((await contract.phaseTwoData()).active).to.be.true;
            });

            it('Should remove the phase 1 active mark', async () => {
                await startPhaseOne();
                await startPhaseTwo();
                expect((await contract.phaseOneData()).active).to.be.false;
            });

            it('Should allow for the owner to start phase 2', async () => {
                await expect(startPhaseTwo()).to.not.be.revertedWith('Ownable: caller is not the owner');
            });

            it('Should not allow for non owner wallets to start phase 2', async () => {
                const [, notOwner] = await ethers.getSigners();
                contract = contract.connect(notOwner);

                await expect(startPhaseTwo()).to.be.revertedWith('Ownable: caller is not the owner');
            });

            it('Should set the correct values', async () => {
                await startPhaseTwo();
                const data = await contract.phaseTwoData();

                expect(await contract.phaseTwoPrice()).to.equal(phaseTwoParams.price);
                expect(data.active).to.be.true;
                expect(data.ticketSupply).to.equal(phaseTwoParams.ticketSupply);
                expect(data.ticketsPerWallet).to.equal(phaseTwoParams.ticketsPerWallet);
            });

        });

        describe('buyPhaseTwo', async () => {

            it('Should only the purchase of tickets if phase 2 has been started', async () => {
                await expect(buyPhaseTwo(phaseTwoParams.price)).to.be.revertedWith('Phase is not active');
                await startPhaseTwo();
                await expect(buyPhaseTwo(phaseTwoParams.price)).to.not.be.revertedWith('Phase is not active');
            });

            it('Should not allow for more than max tickets per wallet', async () => {
                await startPhaseTwo();
                await expect(buyPhaseTwo(phaseTwoParams.price.mul(phaseTwoParams.ticketsPerWallet + 1))).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet');
                await buyPhaseTwo(phaseTwoParams.price.mul(phaseTwoParams.ticketsPerWallet));
                await expect(buyPhaseTwo(phaseTwoParams.price)).to.be.revertedWith('Maximum tickets already reached for this wallet for current phase');
            });

            it('Should not allow for payments more than the current price', async () => {
                await startPhaseTwo();
                await expect(buyPhaseTwo(phaseTwoParams.price.add(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');
            });

            it('Should not allow for payments less than the current price', async () => {
                await startPhaseTwo();
                await expect(buyPhaseTwo(phaseTwoParams.price.sub(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');
                await expect(buyPhaseTwo(0)).to.be.revertedWith('Value has to be greater than 0');
            });

            it('Should not allow the purchase of tickets if phase 2 has been sold out', async () => {
                await startPhaseTwo({ticketSupply: 1});
                await buyPhaseTwo(phaseTwoParams.price);
                await expect(buyPhaseTwo(phaseTwoParams.price)).to.be.revertedWith('No tickets left for sale in the current phase');
            });

            it('Should not allow for non whitelisted wallets to buy tickets', async () => {
                await startPhaseTwo();
                for (const signer of nonWhitelistedSigners) {
                    contract = contract.connect(signer);
                    await expect(buyPhaseTwo(phaseTwoParams.price)).to.be.revertedWith('Address is not whitelisted');
                }
            });

            it('Should allow for whitelisted wallets to buy tickets', async () => {
                await startPhaseTwo();
                for (const signer of whitelistedSigners) {
                    contract = contract.connect(signer);
                    await expect(buyPhaseTwo(phaseTwoParams.price)).to.not.be.revertedWith('Address is not whitelisted');
                }
            });

            for (let i = 1; i <= phaseTwoParams.ticketsPerWallet; ++i) {
                it(`Should allow for a wallet to buy ${i} tickets`, async () => {
                    await startPhaseTwo();
                    await expect(buyPhaseTwo(phaseTwoParams.price.mul(i))).to.not.be.revertedWith('');
                    expect(await contract.getTickets()).to.equal(i);
                });
            }

            it('Should not allow invalid signatures', async () => {
                const [wrongSigner] = await ethers.getSigners();

                await startPhaseTwo();

                // Wrong signer
                const address = await contract.signer.getAddress();
                await expect(buyPhaseTwo(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice, 1, wrongSigner))).to.be.revertedWith('Invalid signature');

                // Wrong data
                await expect(buyPhaseTwo(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice.mul(2), 1))).to.be.revertedWith('Invalid signature');
            });

        });

        describe('stopPhaseTwo', async () => {

            it('Should remove the phase 2 active mark', async () => {
                await startPhaseTwo();
                await stopPhaseTwo();
                expect((await contract.phaseOneData()).active).to.be.false;
            });

            it('Should only allow for the owner to stop phase 2', async () => {
                const [owner, notOwner] = await ethers.getSigners();
                await startPhaseTwo();
                contract = contract.connect(notOwner);
                await expect(contract.stopPhaseTwo()).to.be.revertedWith('Ownable: caller is not the owner');
                contract = contract.connect(owner);
                await expect(contract.stopPhaseTwo()).to.not.be.revertedWith('Ownable: caller is not the owner');
            })

        });
    });

    describe('Phase 3 Functions', async () => {
        describe('startPhaseThree', async () => {
            it('Should mark phase 3 as active', async () => {
            });
            it('Should allow for the owner to start phase 3', async () => {
            })
            it('Should not allow for non owner wallets to start phase 3', async () => {
            })
            it('Should set the correct values', async () => {
            })
        }); // TODO: Implement
        describe('buyPhaseThree', async () => {
            it('Should not allow the purchase of tickets if phase 3 has not been started', async () => {
            });
            it('Should not allow for more than 1 tickets per wallet', async () => {
            });
            it('Should not allow for payments more than the current price', async () => {
            });
            it('Should not allow for payments less than the current price', async () => {
            });
            it('Should not allow the purchase of tickets if phase 3 has been sold out', async () => {
            });
            it('Should not allow for non whitelisted wallets to buy tickets', async () => {
            });
            it('Should allow for whitelisted wallets to buy tickets', async () => {
            });
            it('Should allow for a wallet to buy 1 ticket', async () => {
            });

            it('Should not allow invalid signatures', async () => {
                const [wrongSigner] = await ethers.getSigners();

                await startPhaseThree();

                // Wrong signer
                const address = await contract.signer.getAddress();
                await expect(buyPhaseThree(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice, 1, wrongSigner))).to.be.revertedWith('Invalid signature');

                // Wrong data
                await expect(buyPhaseThree(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice.mul(2), 1))).to.be.revertedWith('Invalid signature');
            });
        }); // TODO: Implement
    });
});
