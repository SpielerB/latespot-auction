import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber, BigNumberish, Contract, ContractReceipt, ContractTransaction, Wallet} from 'ethers';
import {describe} from 'mocha';
import {
    createSignature,
    deploy,
    getBalance,
    increaseNextBlockTime,
    setBalance
} from './helper';
import crypto from 'crypto';

interface InitParams {
    tokenName: string;
    tokenSymbol: string;
    signer: string;
    baseURI: string;
    contractURI: string;
    vrfCoordinator: string;
    ticketsPerWallet: number;
    chainLinkSubscriptionId: number;
}

interface PrivateAuctionParams {
    price: BigNumber;
    supply: BigNumber;
}

interface PublicAuctionParams {
    price: BigNumber;
    supply: BigNumber;
}

const defaultInitParams = async (): Promise<InitParams> => {
    const signers = await ethers.getSigners();
    return {
        tokenName: "AuctionV2",
        tokenSymbol: "AV2",
        signer: await signers[signers.length - 1].getAddress(),
        baseURI: 'https://example.com/token/0',
        contractURI: 'https://example.com/contract',
        vrfCoordinator: '0x6168499c0cFfCaCD319c818142124B7A15E857ab',
        ticketsPerWallet: 5,
        chainLinkSubscriptionId: 42
    };
}

const defaultPrivateAuctionParams = async (): Promise<PrivateAuctionParams> => {
    return {
        price: ethers.utils.parseEther("1"),
        supply: BigNumber.from(2000)
    }
}

const defaultPublicAuctionParams = async (): Promise<PrivateAuctionParams> => {
    return {
        price: ethers.utils.parseEther("2"),
        supply: BigNumber.from(8000)
    }
}

const deployChainLink = async () => {
    return await deploy('MockChainLink');
};

const deployAuction = async (overrides?: Partial<InitParams>) => {
    const defaultParams = await defaultInitParams();
    return await deploy('AuctionV2',
        overrides?.tokenName || defaultParams.tokenName,
        overrides?.tokenSymbol || defaultParams.tokenSymbol,
        overrides?.signer || defaultParams.signer,
        overrides?.baseURI || defaultParams.baseURI,
        overrides?.contractURI || defaultParams.contractURI,
        overrides?.vrfCoordinator || defaultParams.vrfCoordinator,
        overrides?.ticketsPerWallet || defaultParams.ticketsPerWallet);
};

describe('AuctionV2 Contract', async function () {

    const wrapParam = <T>(value: T | undefined, fallback: T) => {
        if (value === undefined) return fallback;
        return value;
    }

    let contract: Contract;
    let chainLinkContract: Contract;
    const whitelistedSigners = (await ethers.getSigners()).filter((_, i) => i % 2 === 0);

    const startPrivateAuction = async (params?: Partial<PrivateAuctionParams>) => {
        const defaultParams = await defaultPrivateAuctionParams();
        const tx: ContractTransaction = await contract.startPrivateAuction(
            wrapParam(params?.price, defaultParams.price),
            wrapParam(params?.supply, defaultParams.supply)
        );
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const buyPrivateAuction = async (value: BigNumberish, signature?: string) => {
        if (signature === undefined) {
            const address = await contract.signer.getAddress();
            const signatureSigner = await ethers.getSigner(await contract.signatureAddress());
            signature = await createSignature(address, value, 'private', signatureSigner);
        }

        const tx: ContractTransaction = await contract.buyPrivateAuction(signature, {value});
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const stopPrivateAuction = async () => {
        const tx: ContractTransaction = await contract.stopPrivateAuction();
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const startPublicAuction = async (params?: Partial<PublicAuctionParams>) => {
        const defaultParams = await defaultPublicAuctionParams();
        const tx: ContractTransaction = await contract.startPublicAuction(
            wrapParam(params?.price, defaultParams.price),
            wrapParam(params?.supply, defaultParams.supply)
        );
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const buyPublicAuction = async (value: BigNumberish, signature?: string) => {
        if (signature === undefined) {
            const address = await contract.signer.getAddress();
            const signatureSigner = await ethers.getSigner(await contract.signatureAddress());
            signature = await createSignature(address, value, 'public', signatureSigner);
        }

        const tx: ContractTransaction = await contract.buyPublicAuction(signature, {value});
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }

    const stopPublicAuction = async () => {
        const tx: ContractTransaction = await contract.stopPublicAuction();
        await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
        return tx;
    }


    beforeEach(async () => {
        chainLinkContract = await deployChainLink();
        contract = await deployAuction({vrfCoordinator: chainLinkContract.address}); // Redeploy contract for each test to ensure clean state
        const tx: ContractTransaction = await contract.whitelist(whitelistedSigners.map(s => s.address));
        await tx.wait();
    })

    context('Initialize', async () => {

        it('Should have the correct owner', async () => {
            expect(await contract.owner()).to.equal(contract.deployTransaction.from);
        });
    });

    context('General Functions', async () => {
        context('tickets', async () => {

            it('Should return the correct amount of tickets after buying', async () => {
                const defaultPrivateParams = await defaultPrivateAuctionParams();
                const defaultPublicParams = await defaultPublicAuctionParams();
                const whitelist = [(await ethers.getSigners())[0].address];
                await contract.whitelist(whitelist);

                await startPrivateAuction();
                await buyPrivateAuction(defaultPrivateParams.price);
                expect(await contract.tickets()).to.equal(1);
                await buyPrivateAuction(defaultPrivateParams.price.mul(2));
                expect(await contract.tickets()).to.equal(3);

                await stopPrivateAuction();
                await startPublicAuction();

                await buyPublicAuction(defaultPublicParams.price.mul(2));
                expect(await contract.tickets()).to.equal(5);
            });
        })

        context('tokenURI', function () {
            it('Should have default base URI if not revealed', async () => {
                for (let i = 0; i < 10; ++i) {
                    expect(await contract.tokenURI(Math.ceil(Math.random() * 10000))).to.equal((await defaultInitParams()).baseURI);
                }
            });

            it('Should have the updated URI if revealed', async () => {
                const baseURI = 'https://test.example.com';
                await contract.requestReveal(baseURI);
                for (let i = 0; i < 10; ++i) {
                    const id = +Math.ceil(Math.random() * 10000).toFixed(0);
                    expect(await contract.tokenURI(id)).to.equal(`${baseURI}/meta_${id}_0.json`);
                }
            });
        });
    });

    context('Owner Functions', async () => {

        describe('defineStakeLevels', function () {
            it('Should set the correct stake levels', async () => {

            });
        });
        context('withdraw', function () {

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

            let privateAuctionParams: PrivateAuctionParams;
            let publicAuctionParams: PublicAuctionParams;

            before(async () => {
                privateAuctionParams = await defaultPrivateAuctionParams();
                publicAuctionParams = await defaultPublicAuctionParams();
            })

            const wallets: Wallet[] = [];
            for (let i = 0; i < 50; ++i) {
                const id = crypto.randomBytes(32).toString('hex');
                const privateKey = "0x" + id;
                const wallet = new ethers.Wallet(privateKey, ethers.provider);
                wallets.push(wallet);
            }

            it('Should mint the same amount of tokens as the wallet has tickets', async () => {
                const [owner] = await ethers.getSigners();
                await contract.whitelist(wallets.map(wallet => wallet.address));
                await startPrivateAuction();
                let total = 0;
                for (const wallet of wallets) {
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    contract = contract.connect(wallet);
                    const price: BigNumber = privateAuctionParams.price;
                    const count = Math.ceil(Math.random() * 5);
                    if (privateAuctionParams.supply.lte(total + count)) {
                        break;
                    }
                    await buyPrivateAuction(price.mul(count));
                    total += count;
                }

                contract = contract.connect(owner);
                await stopPrivateAuction();
                await startPublicAuction();
                total = 0;
                for (const wallet of wallets) {
                    contract = contract.connect(wallet);
                    const price: BigNumber = publicAuctionParams.price;
                    const count = Math.ceil(Math.random() * 5);
                    if (publicAuctionParams.supply.lte(total + count)) {
                        break;
                    }
                    await buyPublicAuction(price.mul(count));
                    total += count;
                }

                contract = contract.connect(owner);
                await stopPublicAuction();

                const supply = await contract.totalSupply();
                const batchSize = 1000;
                const batches = Math.ceil(supply / batchSize);

                for (let i = 0; i < batches; ++i) {
                    await contract.mintAndDistribute(batchSize);
                }

                for (const wallet of wallets) {
                    contract = contract.connect(wallet);
                    expect(await contract.tickets()).to.equal(await contract.balanceOf(wallet.address));
                }
            }).timeout(2 << 31);

            it('Should be able to mint ~1000 tokens', async () => {
                const [owner] = await ethers.getSigners();
                await setBalance(owner.address, ethers.utils.parseEther(privateAuctionParams.price.mul(privateAuctionParams.supply).mul(2).toString()));
                contract = await deployAuction({ticketsPerWallet: 10000})
                await contract.whitelist([await owner.getAddress()]);
                await startPrivateAuction({supply: BigNumber.from(2000)});
                await buyPrivateAuction(privateAuctionParams.price.mul(1000));
                await stopPrivateAuction();
                await startPublicAuction();
                await buyPublicAuction(publicAuctionParams.price.mul(1000));
                await stopPublicAuction();
                const supply = await contract.totalSupply();
                const batchSize = 1000;
                const batches = Math.ceil(supply / batchSize);

                for (let i = 0; i < batches; ++i) {
                    await (await contract.mintAndDistribute(batchSize)).wait();
                }
                expect(await contract.tickets()).to.equal(await contract.balanceOf(owner.address));
            }).timeout(2 << 31);


            it('Should allow for only the owner to mint and distribute', async () => {
                const [owner, other] = await ethers.getSigners();
                await setBalance(owner.address, ethers.utils.parseEther(privateAuctionParams.price.mul(privateAuctionParams.supply).mul(2).toString()));
                contract = await deployAuction({ticketsPerWallet: 10000})
                await contract.whitelist([await owner.getAddress(), await other.getAddress()]);
                await startPrivateAuction({supply: BigNumber.from(2000)});
                await buyPrivateAuction(privateAuctionParams.price);
                await stopPrivateAuction();
                await startPublicAuction();
                await buyPublicAuction(publicAuctionParams.price.mul(1000));
                await stopPublicAuction();
                contract = contract.connect(other);
                await expect(contract.mintAndDistribute(1000)).to.be.reverted;
            });
        });
        context('whitelist', function () {

            it('Should have added the whitelisted addresses', async () => {
                const signers = await ethers.getSigners();

                const whitelist = signers.filter((_, i) => i % 2 === 0).map(s => s.address);

                await (await contract.whitelist(whitelist)).wait();

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

        context('deWhitelist', function () {

            it('Should have added the whitelisted addresses', async () => {
                const signers = await ethers.getSigners();

                const whitelist = signers.filter((_, i) => i % 2 === 0).map(s => s.address);

                await (await contract.whitelist(whitelist)).wait();
                await (await contract.unWhitelist(whitelist)).wait();

                for (let i = 0; i < signers.length; ++i) {
                    contract = contract.connect(signers[i]);
                    expect(await contract.whitelisted()).to.be.false;
                }
            });

        });

        // TODO: Add chainlink integration for requestReveal
        context('requestReveal', function () {
            it('Should request a reveal from ChainLink', async () => {
                await contract.requestReveal('https://test.example.com');
                expect(await contract.revealed()).to.be.true;
            });
        });
    });

    context('Private Auction', async () => {
        describe('startPrivateAuction', async () => {
            it('Should start the private auction', async () => {
                await startPrivateAuction();
                expect(await contract.privateAuctionActive()).to.be.true;
                expect(await contract.privateAuctionStarted()).to.be.true;
                expect(await contract.privateAuctionStopped()).to.be.false;
            });
            it('Should not start start the private auction again', async () => {
                await startPrivateAuction();
                await expect(startPrivateAuction()).to.be.revertedWith('Private auction has already been started');
            });
        });
        describe('buyPrivateAuction', async () => {
            it('Should buy the requested amount of tickets', async () => {
                const price = (await defaultPrivateAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await buyPrivateAuction(price);
                expect(await contract.privateTickets()).to.equal(1);
                expect(await contract.tickets()).to.equal(1);
                await buyPrivateAuction(price.mul(3));
                expect(await contract.privateTickets()).to.equal(4);
                expect(await contract.tickets()).to.equal(4);
            });

            it('Should not allow to buy more than limit', async () => {
                const price = (await defaultPrivateAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await expect(buyPrivateAuction(price.mul(6))).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet for the private auction');
                await buyPrivateAuction(price.mul(3));
                await expect(buyPrivateAuction(price.mul(3))).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet for the private auction');
                await buyPrivateAuction(price.mul(2));
                await expect(buyPrivateAuction(price)).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet for the private auction');
            });

            it('Should not allow to buy over total', async () => {
                const price = (await defaultPrivateAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction({supply: BigNumber.from(2)});
                await expect(buyPrivateAuction(price.mul(3))).to.be.revertedWith('There are not enough tickets left in the private auction');
                await buyPrivateAuction(price.mul(2));
                await expect(buyPrivateAuction(price)).to.be.revertedWith('Private auction is not active');
            });

            it('Should not allow to buy after stopped', async () => {
                const price = (await defaultPrivateAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await stopPrivateAuction();
                await expect(buyPrivateAuction(price)).to.be.revertedWith('Private auction is not active');
            });

            it('Should not allow wrong signature', async () => {
                const price = (await defaultPrivateAuctionParams()).price;
                const [wallet, otherWallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await expect(buyPrivateAuction(price, await createSignature(wallet.address, 2, 'unknown'))).to.be.revertedWith('Invalid signature');
                await expect(buyPrivateAuction(price, await createSignature(otherWallet.address, price, 'private'))).to.be.revertedWith('Invalid signature');
                await expect(buyPrivateAuction(price, await createSignature(wallet.address, price, 'private', otherWallet))).to.be.revertedWith('Invalid signature');
                await expect(buyPrivateAuction(price, await createSignature(wallet.address, 2, 'private'))).to.be.revertedWith('Invalid signature');
                await expect(buyPrivateAuction(price, await createSignature(wallet.address, price, 'unknown'))).to.be.revertedWith('Invalid signature');
            });

            it('Should not allow wrong price', async () => {
                const price = (await defaultPrivateAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await expect(buyPrivateAuction(price.add(1))).to.be.revertedWith('Value has to be a multiple of the price');
                await expect(buyPrivateAuction(price.sub(1))).to.be.revertedWith('Value has to be a multiple of the price');
                await expect(buyPrivateAuction(0)).to.be.revertedWith('Value has to be greater than 0');
            });
        });
        describe('stopPrivateAuction', async () => {

            it('Should stop the private auction', async () => {
                await startPrivateAuction();
                await stopPrivateAuction();
                expect(await contract.privateAuctionActive()).to.be.false;
                expect(await contract.privateAuctionStarted()).to.be.true;
                expect(await contract.privateAuctionStopped()).to.be.true;
            });
        });
    });

    context('Public Auction', async () => {
        describe('startPublicAuction', async () => {
            it('Should not start the public auction before the private auction', async () => {
                const {price, supply} = await defaultPublicAuctionParams();
                await expect(contract.startPublicAuction(price, supply)).to.be.revertedWith('Public auction must start after private auction');
            });

            it('Should not start the public auction if the private auction is active', async () => {
                const {price, supply} = await defaultPublicAuctionParams();
                await startPrivateAuction();
                await expect(contract.startPublicAuction(price, supply)).to.be.revertedWith('Private auction is still active');
            });

            it('Should start the public auction', async () => {
                await startPrivateAuction();
                await stopPrivateAuction();
                await startPublicAuction();
                expect(await contract.publicAuctionActive()).to.be.true;
                expect(await contract.publicAuctionStarted()).to.be.true;
                expect(await contract.publicAuctionStopped()).to.be.false;
            });
            it('Should not start start the public auction again', async () => {
                await startPrivateAuction();
                await stopPrivateAuction();
                await startPublicAuction();
                await expect(startPublicAuction()).to.be.revertedWith('Public auction has already been started');
            });
        });
        describe('buyPublicAuction', async () => {
            it('Should buy the requested amount of tickets', async () => {
                const price = (await defaultPublicAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await stopPrivateAuction();
                await startPublicAuction();
                await buyPublicAuction(price);
                expect(await contract.publicTickets()).to.equal(1);
                expect(await contract.tickets()).to.equal(1);
                await buyPublicAuction(price.mul(3));
                expect(await contract.publicTickets()).to.equal(4);
                expect(await contract.tickets()).to.equal(4);
            });

            it('Should not allow to buy more than limit', async () => {
                const price = (await defaultPublicAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await stopPrivateAuction();
                await startPublicAuction();
                await expect(buyPublicAuction(price.mul(6))).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet for the public auction');
                await buyPublicAuction(price.mul(3));
                await expect(buyPublicAuction(price.mul(3))).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet for the public auction');
                await buyPublicAuction(price.mul(2));
                await expect(buyPublicAuction(price)).to.be.revertedWith('Total ticket count is higher than the max allowed tickets per wallet for the public auction');
            });

            it('Should not allow to buy over total', async () => {
                const price = (await defaultPublicAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await stopPrivateAuction();
                await startPublicAuction({supply: BigNumber.from(2)});
                await expect(buyPublicAuction(price.mul(3))).to.be.revertedWith('There are not enough tickets left in the public auction');
                await buyPublicAuction(price.mul(2));
                await expect(buyPublicAuction(price)).to.be.revertedWith('Public auction is not active');
            });

            it('Should not allow to buy after stopped', async () => {
                const price = (await defaultPublicAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await stopPrivateAuction();
                await startPublicAuction();
                await stopPublicAuction();
                await expect(buyPublicAuction(price)).to.be.revertedWith('Public auction is not active');
            });

            it('Should not allow wrong signature', async () => {
                const price = (await defaultPublicAuctionParams()).price;
                const [wallet, otherWallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await stopPrivateAuction();
                await startPublicAuction();
                await expect(buyPublicAuction(price, await createSignature(wallet.address, 2, 'unknown'))).to.be.revertedWith('Invalid signature');
                await expect(buyPublicAuction(price, await createSignature(otherWallet.address, price, 'public'))).to.be.revertedWith('Invalid signature');
                await expect(buyPublicAuction(price, await createSignature(wallet.address, price, 'public', otherWallet))).to.be.revertedWith('Invalid signature');
                await expect(buyPublicAuction(price, await createSignature(wallet.address, 2, 'public'))).to.be.revertedWith('Invalid signature');
                await expect(buyPublicAuction(price, await createSignature(wallet.address, price, 'unknown'))).to.be.revertedWith('Invalid signature');
            });

            it('Should not allow wrong price', async () => {
                const price = (await defaultPublicAuctionParams()).price;
                const [wallet] = await ethers.getSigners();
                await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                await startPrivateAuction();
                await stopPrivateAuction();
                await startPublicAuction();
                await expect(buyPublicAuction(price.add(1))).to.be.revertedWith('Value has to be a multiple of the price');
                await expect(buyPublicAuction(price.sub(1))).to.be.revertedWith('Value has to be a multiple of the price');
                await expect(buyPublicAuction(0)).to.be.revertedWith('Value has to be greater than 0');
            });
        });
        describe('stopPublicAuction', async () => {

            it('Should stop the public auction', async () => {
                await startPrivateAuction();
                await stopPrivateAuction();
                await startPublicAuction();
                await buyPublicAuction((await defaultPublicAuctionParams()).price)
                await stopPublicAuction();
                expect(await contract.publicAuctionActive()).to.be.false;
                expect(await contract.publicAuctionStarted()).to.be.true;
                expect(await contract.publicAuctionStopped()).to.be.true;
            });
        });
    });

    context('Staking', async () => {
        beforeEach(async () => {
            chainLinkContract = await deployChainLink();
            contract = await deployAuction({vrfCoordinator: chainLinkContract.address}); // Redeploy contract for each test to ensure clean state
            const tx: ContractTransaction = await contract.whitelist(whitelistedSigners.map(s => s.address));
            await tx.wait();

            await setBalance(await contract.signer.getAddress(), ethers.utils.parseEther('100000'));
            const {price: privatePrice} = await defaultPrivateAuctionParams();
            const {price: publicPrice} = await defaultPublicAuctionParams();
            await contract.defineStakeLevels([3600, 7200, 10800, 14400, 18000]);
            await startPrivateAuction();
            await buyPrivateAuction(privatePrice.mul(5));
            await stopPrivateAuction();
            await startPublicAuction();
            await buyPublicAuction(publicPrice.mul(5));
            await stopPublicAuction();
            await contract.mintAndDistribute(10);
        });

        describe('stake', async () => {
            it('Should not allow to stake if not revealed', async () => {
                await expect(contract.stake(1)).to.be.revertedWith('Tokens have not been revealed');
            });
            it('Should only allow the wallets token to be staked', async () => {
                await contract.requestReveal('https://test.example.com');
                const [, otherWallet] = await ethers.getSigners();
                contract = contract.connect(otherWallet);
                await expect(contract.stake(1)).to.be.revertedWith('This token does not belong to the sender wallet');
            });
            it('Should not allow for already staked tokens to be staked', async () => {
                await contract.requestReveal('https://test.example.com');
                await contract.stake(1);
                await expect(contract.stake(1)).to.be.revertedWith('Token has already been staked');

            });
            it('Should not allowed previously successful staked tokens to be staked again', async () => {
                await contract.requestReveal('https://test.example.com');
                await contract.stake(1);
                await increaseNextBlockTime(3601);
                await contract.unStake(1);
                await expect(contract.stake(1)).to.be.revertedWith('Token has already been staked beyond level 0');
            });
            it('Should allowed previously unsuccessful staked tokens to be staked again', async () => {
                await contract.requestReveal('https://test.example.com');
                await contract.stake(1);
                await contract.unStake(1);
                await contract.stake(1);
            });
        });

        describe('unStake', async () => {
            it('Should not allow to stake if not revealed', async () => {

            });
            it('Should only allow the wallets token to be staked', async () => {

            });
            it('Should update the staked time', async () => {

            });
        });

        describe('stakeLevel', async () => {
            it('Should not allow to stake if not revealed', async () => {

            });
            it('Should only allow the wallets token to be staked', async () => {

            });
            it('Should update the staked time', async () => {

            });
        });
    });
});
