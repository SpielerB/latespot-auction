import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber, BigNumberish, Contract, ContractReceipt, ContractTransaction, Wallet} from 'ethers';
import {describe} from 'mocha';
import {createSignature, deployProxy, getBalance, mineBlocks, setBalance} from './helper';
import crypto from 'crypto';

interface InitParams {
    tokenName: string;
    tokenSymbol: string;
    tokenSupply: number;
    signer: string;
    baseURI: string;
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
    return await deployProxy('Auction', overrides?.tokenName || 'LateSpotNFT',
        overrides?.tokenSymbol || 'LSNFT',
        overrides?.tokenSupply || 10000,
        overrides?.signer || signers[signers.length - 1].address,
        overrides?.baseURI || 'https://api.squirrel.trivetia.org/token/0');
};

describe('Auction Contract', async function () {

    const wrapParam = <T>(value: T | undefined, fallback: T) => {
        if (value === undefined) return fallback;
        return value;
    }

    let contract: Contract;
    const whitelistedSigners = (await ethers.getSigners()).filter((_, i) => i % 2 === 0);
    const nonWhitelistedSigners = (await ethers.getSigners()).filter((_, i) => i % 2 === 1);

    const startPhaseOne = async (params?: Partial<PhaseOneParams>) => {
        const tx: ContractTransaction = await contract.startPhaseOne(
            wrapParam(params?.startPrice, phaseOneParams.startPrice),
            wrapParam(params?.priceStep, phaseOneParams.priceStep),
            wrapParam(params?.blocksPerPriceStep, phaseOneParams.blocksPerPriceStep),
            wrapParam(params?.floorPrice, phaseOneParams.floorPrice),
            wrapParam(params?.ticketsPerWallet, phaseOneParams.ticketsPerWallet),
            wrapParam(params?.ticketSupply, phaseOneParams.ticketSupply)
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
            wrapParam(params?.price, phaseTwoParams.price),
            wrapParam(params?.ticketSupply, phaseTwoParams.ticketSupply),
            wrapParam(params?.ticketsPerWallet, phaseTwoParams.ticketsPerWallet)
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
            wrapParam(params?.price, phaseThreeParams.price),
            wrapParam(params?.ticketsPerWallet, phaseThreeParams.ticketsPerWallet)
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
        const tx: ContractTransaction = await contract.addToWhitelist(whitelistedSigners.map(s => s.address));
        await tx.wait();
    })

    describe('Initialize', async () => {

        it('Should have the correct owner', async () => {
            expect(await contract.owner()).to.equal(contract.deployTransaction.from);
        });

        it('Should set the correct total ticket supply', async () => {
            const totalTicketSupply = 12000;
            contract = await deployAuction({tokenSupply: totalTicketSupply});
            expect(await contract.totalSupply()).to.equal(totalTicketSupply);
        });
    });

    describe('General Functions', async () => {
        describe('currentPhase', async () => {

            it('Should return correct value for phase 1 active', async () => {
                await startPhaseOne();
                expect(await contract.currentPhase()).to.equal(1);
            });

            it('Should return correct value for phase 2 active', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo();
                expect(await contract.currentPhase()).to.equal(2);
            });
            it('Should return correct value for phase 3 active', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo({ticketSupply: 0});
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

                const whitelist = [(await ethers.getSigners())[0].address];
                await contract.addToWhitelist(whitelist);

                await startPhaseOne({ticketSupply: 3});
                await buyPhaseOne(phaseOneParams.startPrice);
                expect(await contract.getTickets()).to.equal(1);
                await buyPhaseOne(phaseOneParams.startPrice.mul(2));
                expect(await contract.getTickets()).to.equal(3);

                await startPhaseTwo({ticketSupply: 2});
                await buyPhaseTwo(phaseTwoParams.price.mul(2));
                expect(await contract.getTickets()).to.equal(5);

                await startPhaseThree();
                await buyPhaseThree(phaseThreeParams.price);
                expect(await contract.getTickets()).to.equal(6);
            });
        })
    });

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
                await expect(contract.withdraw()).to.be.revertedWith('');

                await expect(await getBalance(contract.address)).to.equal(contractStartBalance);
            });
        });
        describe('mintAndDistribute', function () {
            const wallets: Wallet[] = [];
            for (let i = 0; i < 113; ++i) {
                const id = crypto.randomBytes(32).toString('hex');
                const privateKey = "0x" + id;
                const wallet = new ethers.Wallet(privateKey, ethers.provider);
                wallets.push(wallet);
            }

            it('Should mint the same amount of tokens as the wallet has tickets', async () => {
                const [owner] = await ethers.getSigners();
                await startPhaseOne();
                for (const wallet of wallets) {
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    contract = contract.connect(wallet);
                    const price: BigNumber = await contract.nextBlockPricePhaseOne();
                    const count = Math.ceil(Math.random() * 5);
                    await buyPhaseOne(price.mul(count));
                }

                contract = contract.connect(owner);

                const ticketHolders = await contract.ticketHolderCount();

                const batchSize = 100;
                const batches = Math.ceil(ticketHolders / batchSize);

                for (let i = 0; i < batches; ++i) {
                    await contract.mintAndDistribute(batchSize);
                }
                for (const wallet of wallets) {
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    contract = contract.connect(wallet);
                    expect(await contract.getTickets()).to.equal(await contract.balanceOf(wallet.address));
                }
            }).timeout(2 << 31);


            it('Should allow for only the owner to mint and distribute', async () => {
                const [, notOwner] = await ethers.getSigners();
                await expect(contract.mintAndDistribute(100)).to.not.be.revertedWith('');

                contract = contract.connect(notOwner);

                await expect(contract.mintAndDistribute(100)).to.be.revertedWith('');
            });
        });
        describe('addToWhitelist', function () {

            it('Should have added the whitelisted addresses', async () => {
                const signers = await ethers.getSigners();

                const whitelist = signers.filter((_, i) => i % 2 === 0).map(s => s.address);

                await (await contract.addToWhitelist(whitelist)).wait();

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
        describe('reveal', function () {

            it('Should update the url and add revealed flag', () => {
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
                expect(startPhaseOne()).to.not.be.revertedWith('');
            });

            it('Should not allow for non owner wallets to start phase 1', async () => {
                const [, notOwner] = await ethers.getSigners();
                contract = contract.connect(notOwner);

                expect(startPhaseOne()).to.be.revertedWith('');
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
                await startPhaseOne({ticketSupply: 0});
                expect((await contract.phaseTwoData()).active).to.be.false;
                await startPhaseTwo();
                expect((await contract.phaseTwoData()).active).to.be.true;
            });

            it('Should allow for the owner to start phase 2', async () => {
                await startPhaseOne({ticketSupply: 0});
                await expect(startPhaseTwo()).to.not.be.revertedWith('');
            });

            it('Should not allow for non owner wallets to start phase 2', async () => {
                const [, notOwner] = await ethers.getSigners();
                await startPhaseOne({ticketSupply: 0});

                contract = contract.connect(notOwner);

                await expect(startPhaseTwo()).to.be.revertedWith('');
            });

            it('Should set the correct values', async () => {
                await startPhaseOne({ticketSupply: 0});
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
                await startPhaseOne({ticketSupply: 0});
                await expect(buyPhaseTwo(phaseTwoParams.price)).to.be.revertedWith('Phase is not active');
                await startPhaseTwo();
                await expect(buyPhaseTwo(phaseTwoParams.price)).to.not.be.revertedWith('Phase is not active');
            });

            it('Should not allow for more than max tickets per wallet', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo();
                await expect(buyPhaseTwo(phaseTwoParams.price.mul(phaseTwoParams.ticketsPerWallet + 1))).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet');
                await buyPhaseTwo(phaseTwoParams.price.mul(phaseTwoParams.ticketsPerWallet));
                await expect(buyPhaseTwo(phaseTwoParams.price)).to.be.revertedWith('Maximum tickets already reached for this wallet for current phase');
            });

            it('Should not allow for payments more than the current price', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo();
                await expect(buyPhaseTwo(phaseTwoParams.price.add(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');
            });

            it('Should not allow for payments less than the current price', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo();
                await expect(buyPhaseTwo(phaseTwoParams.price.sub(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');
                await expect(buyPhaseTwo(0)).to.be.revertedWith('Value has to be greater than 0');
            });

            it('Should not allow the purchase of tickets if phase 2 has been sold out', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo({ticketSupply: 1});
                await buyPhaseTwo(phaseTwoParams.price);
                await expect(buyPhaseTwo(phaseTwoParams.price)).to.be.revertedWith('No tickets left for sale in the current phase');
            });

            it('Should not allow for non whitelisted wallets to buy tickets', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo();
                for (const signer of nonWhitelistedSigners) {
                    contract = contract.connect(signer);
                    await expect(buyPhaseTwo(phaseTwoParams.price)).to.be.revertedWith('Address is not whitelisted');
                }
            });

            it('Should allow for whitelisted wallets to buy tickets', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo();
                for (const signer of whitelistedSigners) {
                    contract = contract.connect(signer);
                    await expect(buyPhaseTwo(phaseTwoParams.price)).to.not.be.revertedWith('Address is not whitelisted');
                }
            });

            for (let i = 1; i <= phaseTwoParams.ticketsPerWallet; ++i) {
                it(`Should allow for a wallet to buy ${i} tickets`, async () => {
                    await startPhaseOne({ticketSupply: 0});
                    await startPhaseTwo();
                    await expect(buyPhaseTwo(phaseTwoParams.price.mul(i))).to.not.be.revertedWith('');
                    expect(await contract.getTickets()).to.equal(i);
                });
            }

            it('Should not allow invalid signatures', async () => {
                const [wrongSigner] = await ethers.getSigners();

                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo();

                // Wrong signer
                const address = await contract.signer.getAddress();
                await expect(buyPhaseTwo(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice, 1, wrongSigner))).to.be.revertedWith('Invalid signature');

                // Wrong data
                await expect(buyPhaseTwo(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice.mul(2), 1))).to.be.revertedWith('Invalid signature');
            });

        });

        describe('stopPhaseTwo', async () => {

            it('Should mark phase 2 as stopped', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo();
                await stopPhaseTwo();
                expect((await contract.phaseTwoData()).stopped).to.be.true;
            });

            it('Should only allow for the owner to stop phase 2', async () => {
                const [owner, notOwner] = await ethers.getSigners();
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo();
                contract = contract.connect(notOwner);
                await expect(contract.stopPhaseTwo()).to.be.revertedWith('');
                contract = contract.connect(owner);
                await expect(contract.stopPhaseTwo()).to.not.be.revertedWith('');
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
                const [, notOwner] = await ethers.getSigners();
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo({ticketSupply: 0});

                contract = contract.connect(notOwner);

                await expect(startPhaseThree()).to.be.revertedWith('');
            })

            it('Should set the correct values', async () => {
                const tokenSupply = 913;
                contract = await deployAuction({tokenSupply});
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo({ticketSupply: 0});
                await startPhaseThree();
                const data = await contract.phaseThreeData();

                expect(await contract.phaseThreePrice()).to.equal(phaseThreeParams.price);
                expect(data.active).to.be.true;
                expect(data.ticketSupply).to.equal(tokenSupply);
                expect(data.ticketsPerWallet).to.equal(phaseThreeParams.ticketsPerWallet);
            })

        });

        describe('buyPhaseThree', async () => {
            it('Should not allow the purchase of tickets if phase 3 has not been started', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo({ticketSupply: 0});

                await expect(buyPhaseThree(phaseThreeParams.price)).to.be.revertedWith('Phase is not active');
                await startPhaseThree();
                await expect(buyPhaseThree(phaseThreeParams.price)).to.not.be.revertedWith('Phase is not active');
            });
            it('Should not allow for more than the max amount tickets per wallet', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo({ticketSupply: 0});
                await startPhaseThree();

                await expect(buyPhaseThree(phaseThreeParams.price.mul(phaseThreeParams.ticketsPerWallet + 1))).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet');

                await buyPhaseThree(phaseThreeParams.price.mul(phaseThreeParams.ticketsPerWallet));
                await expect(buyPhaseThree(phaseThreeParams.price)).to.be.revertedWith('Maximum tickets already reached for this wallet for current phase');
            });

            it('Should not allow for payments more than the current price', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo({ticketSupply: 0});
                await startPhaseThree();

                await expect(buyPhaseThree(phaseThreeParams.price.add(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');
            });

            it('Should not allow for payments less than the current price', async () => {
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo({ticketSupply: 0});
                await startPhaseThree();

                await expect(buyPhaseThree(phaseThreeParams.price.sub(1))).to.be.revertedWith('Value has to be a multiple of the price for the current block');
                await expect(buyPhaseThree(0)).to.be.revertedWith('Value has to be greater than 0');
            });

            it('Should not allow the purchase of tickets if phase 3 has been sold out', async () => {
                const [, other1, other2] = await ethers.getSigners();
                contract = await deployAuction({tokenSupply: 1})
                await startPhaseOne({ticketSupply: 0})
                await startPhaseTwo({ticketSupply: 0})
                await startPhaseThree();

                contract = contract.connect(other1);
                await buyPhaseThree(phaseThreeParams.price);

                contract = contract.connect(other2);
                await expect(buyPhaseThree(phaseThreeParams.price)).to.be.revertedWith('No tickets left for sale in the current phase');
            });

            for (let i = 1; i <= phaseThreeParams.ticketsPerWallet; ++i) {
                it(`Should allow for a wallet to buy ${i} ticket`, async () => {
                    await startPhaseOne({ticketSupply: 0});
                    await startPhaseTwo({ticketSupply: 0});
                    await startPhaseThree();

                    await expect(buyPhaseThree(phaseThreeParams.price.mul(i))).to.not.be.revertedWith('');
                    expect(await contract.getTickets()).to.equal(i);
                });
            }

            it('Should not allow invalid signatures', async () => {
                const [wrongSigner] = await ethers.getSigners();
                await startPhaseOne({ticketSupply: 0});
                await startPhaseTwo({ticketSupply: 0});
                await startPhaseThree();

                // Wrong signer
                const address = await contract.signer.getAddress();
                await expect(buyPhaseThree(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice, 1, wrongSigner))).to.be.revertedWith('Invalid signature');

                // Wrong data
                await expect(buyPhaseThree(phaseOneParams.startPrice, await createSignature(address, phaseOneParams.startPrice.mul(2), 1))).to.be.revertedWith('Invalid signature');
            });
        });
    });
});
