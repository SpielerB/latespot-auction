import {ethers} from 'hardhat';
import {BigNumber, BigNumberish, Contract, ContractReceipt, ContractTransaction, Wallet} from 'ethers';
import {createSignature, deploy, deployProxy, getBalance, increaseNextBlockTime, setBalance} from './helper';
import {expect} from 'chai';
import {describe} from 'mocha';
import crypto from 'crypto';
import {fail} from 'assert';

interface InitParams {
    tokenName: string;
    tokenSymbol: string;
    signer: string;
    baseURI: string;
    contractURI: string;
    vrfCoordinator: string;
    vrfWrapper: string;
    linkToken: string;
    chainLinkSubscriptionId: number;
    chainLinkKeyHash: string;
}

interface PrivateAuctionParams {
    price: BigNumber;
    supply: BigNumber;
    ticketsPerWallet: number;
}

interface PublicAuctionParams {
    price: BigNumber;
    supply: BigNumber;
    ticketsPerWallet: number;
}

interface ChainLinkContracts {
    vrfCoordinator: Contract,
    vrfWrapper: Contract,
    linkToken: Contract
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
        vrfWrapper: '0x6168499c0cFfCaCD319c818142124B7A15E857ab',
        linkToken: '0x6168499c0cFfCaCD319c818142124B7A15E857ab',
        chainLinkSubscriptionId: 42,
        chainLinkKeyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"
    };
}

const defaultPrivateAuctionParams = async (): Promise<PrivateAuctionParams> => {
    return {
        price: ethers.utils.parseEther("1"),
        supply: BigNumber.from(2000),
        ticketsPerWallet: 2
    }
}

const defaultPublicAuctionParams = async (): Promise<PrivateAuctionParams> => {
    return {
        price: ethers.utils.parseEther("2"),
        supply: BigNumber.from(8000),
        ticketsPerWallet: 5
    }
}

const deployChainLink = async (): Promise<ChainLinkContracts> => {
    const vrfCoordinator = await deploy('MockChainLink');
    return {
        linkToken: await deploy('MockLinkToken'),
        vrfCoordinator,
        vrfWrapper: await deploy('MockVRFWrapper', vrfCoordinator.address)
    };
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
        overrides?.chainLinkSubscriptionId || defaultParams.chainLinkSubscriptionId,
        overrides?.chainLinkKeyHash || defaultParams.chainLinkKeyHash);
};

const deployAuctionProxy = async (overrides?: Partial<InitParams>) => {
    const defaultParams = await defaultInitParams();
    return await deployProxy('AuctionV2Upgradeable',
        overrides?.tokenName || defaultParams.tokenName,
        overrides?.tokenSymbol || defaultParams.tokenSymbol,
        overrides?.signer || defaultParams.signer,
        overrides?.baseURI || defaultParams.baseURI,
        overrides?.contractURI || defaultParams.contractURI,
        overrides?.linkToken || defaultParams.linkToken,
        overrides?.vrfWrapper || defaultParams.vrfWrapper);
};

const contractTests = (name: string, deployAuction: (overrides?: Partial<InitParams>) => Promise<Contract>) => {
    describe(name, async function () {
        const wrapParam = <T>(value: T | undefined, fallback: T) => {
            if (value === undefined) return fallback;
            return value;
        }

        let contract: Contract;
        let chainLinkContracts: ChainLinkContracts;
        const getWhitelistedSigners = async () => (await ethers.getSigners()).filter((_, i) => i % 2 === 0);

        const startPrivateAuction = async (params?: Partial<PrivateAuctionParams>) => {
            const defaultParams = await defaultPrivateAuctionParams();
            const tx: ContractTransaction = await contract.startPrivateAuction(
                wrapParam(params?.price, defaultParams.price),
                wrapParam(params?.supply, defaultParams.supply),
                wrapParam(params?.ticketsPerWallet, defaultParams.ticketsPerWallet)
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
                wrapParam(params?.supply, defaultParams.supply),
                wrapParam(params?.ticketsPerWallet, defaultParams.ticketsPerWallet)
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
            chainLinkContracts = await deployChainLink();
            contract = await deployAuction({
                vrfCoordinator: chainLinkContracts.vrfCoordinator.address,
                linkToken: chainLinkContracts.linkToken.address,
                vrfWrapper: chainLinkContracts.vrfWrapper.address
            }); // Redeploy contract for each test to ensure clean state
            const tx: ContractTransaction = await contract.whitelist((await getWhitelistedSigners()).map(s => s.address));
            await tx.wait();
        })

        context('Initialize', async function () {

            it('Should have the correct owner', async function () {
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

                    await startPrivateAuction({ticketsPerWallet: 5});
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
                    await startPrivateAuction({
                        supply: BigNumber.from(5),
                        price: BigNumber.from(1),
                        ticketsPerWallet: 5
                    })
                    await buyPrivateAuction(5);
                    await stopPrivateAuction();
                    await startPublicAuction({supply: BigNumber.from(5), price: BigNumber.from(1)})
                    await buyPublicAuction(5);
                    await stopPublicAuction();
                    await contract.mintAndDistribute(10);

                    await contract.defineStakeLevels([1000000]);

                    const baseURI = 'https://test.example.com';
                    await contract.requestReveal(baseURI);
                    const seed = await contract.seed();
                    const totalSupply = await contract.totalSupply();
                    const offset = seed % totalSupply;
                    for (let i = 1; i <= 10; ++i) {
                        const metaId = (i + offset) % totalSupply + 1;
                        expect(await contract.tokenURI(i)).to.equal(`${baseURI}/${metaId}_0.json`);
                    }
                });

                it('Should point to the correct level', async () => {
                    await startPrivateAuction({
                        supply: BigNumber.from(5),
                        price: BigNumber.from(1),
                        ticketsPerWallet: 5
                    })
                    await buyPrivateAuction(5);
                    await stopPrivateAuction();
                    await startPublicAuction({supply: BigNumber.from(5), price: BigNumber.from(1)})
                    await buyPublicAuction(5);
                    await stopPublicAuction();
                    await contract.mintAndDistribute(10);

                    await contract.defineStakeLevels([10, 20, 30]);

                    const baseURI = 'https://test.example.com';
                    await contract.requestReveal(baseURI);
                    await contract.stake(2);
                    await contract.stake(3);
                    await contract.stake(4);
                    await increaseNextBlockTime(10);
                    await contract.unStake(2);
                    await increaseNextBlockTime(10);
                    await contract.unStake(3);
                    await increaseNextBlockTime(10);
                    await contract.unStake(4);
                    const seed = await contract.seed();
                    const totalSupply = await contract.totalSupply();
                    const offset = seed % totalSupply;
                    expect(await contract.tokenURI(1)).to.equal(`${baseURI}/${(1 + offset) % totalSupply + 1}_0.json`);
                    expect(await contract.tokenURI(2)).to.equal(`${baseURI}/${(2 + offset) % totalSupply + 1}_1.json`);
                    expect(await contract.tokenURI(3)).to.equal(`${baseURI}/${(3 + offset) % totalSupply + 1}_2.json`);
                    expect(await contract.tokenURI(4)).to.equal(`${baseURI}/${(4 + offset) % totalSupply + 1}_3.json`);
                });
            });
        });

        context('Owner Functions', async () => {

            describe('defineStakeLevels', function () {
                it('Should set the correct stake levels', async () => {
                    const levels = [
                        60 * 60 * 24 * 30, // 30 days
                        60 * 60 * 24 * 60 // 60 days
                    ];
                    await contract.defineStakeLevels(levels);
                    expect((await contract.stakeLevels()).map((n: BigNumber) => n.toNumber())).to.contain.all.members(levels);
                });
            });
            context('withdraw', function () {

                it('Should allow for the owner to withdraw the balance of the contract', async () => {
                    const [owner] = await ethers.getSigners();

                    await startPrivateAuction();
                    await stopPrivateAuction();
                    await startPublicAuction();
                    await stopPublicAuction();
                    await contract.defineStakeLevels([1234]);
                    await contract.requestReveal("Test");

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
                it('Should not mint if the public auction has not been cleaned up', async () => {
                    await startPrivateAuction({supply: BigNumber.from(1), price: BigNumber.from(1)});
                    await buyPrivateAuction(1);
                    await stopPrivateAuction();
                    await startPublicAuction({supply: BigNumber.from(1), price: BigNumber.from(1)});
                    await buyPublicAuction(1);
                    await expect(contract.mintAndDistribute(1000)).to.be.revertedWith('Public auction has to be cleaned up using the stopPublicAuction() function before minting');
                });

                it('Should mint the same amount of tokens as the wallet has tickets', async () => {
                    const [owner] = await ethers.getSigners();
                    await contract.whitelist(wallets.map(wallet => wallet.address));
                    await startPrivateAuction();
                    let total = 0;
                    for (const wallet of wallets) {
                        await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                        contract = contract.connect(wallet);
                        const price: BigNumber = privateAuctionParams.price;
                        const count = Math.ceil(Math.random() * 2);
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
                    contract = await deployAuction()
                    await contract.whitelist([await owner.getAddress()]);
                    await startPrivateAuction({supply: BigNumber.from(2000), ticketsPerWallet: 2000});
                    await buyPrivateAuction(privateAuctionParams.price.mul(1000));
                    await stopPrivateAuction();
                    await startPublicAuction({ticketsPerWallet: 8000});
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
                    contract = await deployAuction()
                    await contract.whitelist([await owner.getAddress(), await other.getAddress()]);
                    await startPrivateAuction({supply: BigNumber.from(2000), ticketsPerWallet: 2000});
                    await buyPrivateAuction(privateAuctionParams.price);
                    await stopPrivateAuction();
                    await startPublicAuction({ticketsPerWallet: 8000});
                    await buyPublicAuction(publicAuctionParams.price.mul(1000));
                    await stopPublicAuction();
                    contract = contract.connect(other);
                    await expect(contract.mintAndDistribute(1000)).to.be.reverted;
                });

                it('Should revert if no tokens can be minted', async () => {
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

                it('Should have removed the whitelisted addresses', async () => {
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

            context('requestReveal', function () {
                it('Should request a reveal from ChainLink', async () => {
                    await startPrivateAuction({supply: BigNumber.from(1), price: BigNumber.from(1)});
                    await buyPrivateAuction(1);
                    await stopPrivateAuction();
                    await startPublicAuction({supply: BigNumber.from(1), price: BigNumber.from(1)});
                    await buyPublicAuction(1);
                    await stopPublicAuction();
                    await contract.mintAndDistribute(1000);
                    await contract.defineStakeLevels([10000]);
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

                it('Should prevent 0 tickets per wallet', async () => {
                    const {price, supply} = await defaultPublicAuctionParams();
                    await expect(contract.startPrivateAuction(price, supply, 0)).to.be.revertedWith('Requires at least 1 ticket per wallet');
                });
                it('Should set the correct ticket limit per wallet', async () => {
                    await startPrivateAuction();
                    expect(await contract.privateAuctionTicketsPerWallet()).to.equal(2);
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
                    await startPrivateAuction({ticketsPerWallet: 5});
                    await buyPrivateAuction(price);
                    expect(await contract.privateAuctionTickets()).to.equal(1);
                    expect(await contract.tickets()).to.equal(1);
                    await buyPrivateAuction(price.mul(3));
                    expect(await contract.privateAuctionTickets()).to.equal(4);
                    expect(await contract.tickets()).to.equal(4);
                });

                it('Should not allow to buy more than limit', async () => {
                    const price = (await defaultPrivateAuctionParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateAuction({ticketsPerWallet: 5});
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
                    await startPrivateAuction({supply: BigNumber.from(2), ticketsPerWallet: 5});
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
                    const {price, supply, ticketsPerWallet} = await defaultPublicAuctionParams();
                    await expect(contract.startPublicAuction(price, supply, ticketsPerWallet)).to.be.revertedWith('Public auction must start after private auction');
                });
                it('Should not start the public auction if the private auction is active', async () => {
                    const {price, supply, ticketsPerWallet} = await defaultPublicAuctionParams();
                    await startPrivateAuction();
                    await expect(contract.startPublicAuction(price, supply, ticketsPerWallet)).to.be.revertedWith('Private auction is still active');
                });
                it('Should not start the public auction before the private auction has been cleaned up', async () => {
                    const {price, supply, ticketsPerWallet} = await defaultPublicAuctionParams();
                    await startPrivateAuction({supply: BigNumber.from(1), price: BigNumber.from(1)});
                    await buyPrivateAuction(1);
                    await expect(contract.startPublicAuction(price, supply, ticketsPerWallet)).to.be.revertedWith('Private auction has to be cleaned up using the stopPrivateAuction() function before starting the public auction');
                });
                it('Should start the public auction', async () => {
                    await startPrivateAuction();
                    await stopPrivateAuction();
                    await startPublicAuction();
                    expect(await contract.publicAuctionActive()).to.be.true;
                    expect(await contract.publicAuctionStarted()).to.be.true;
                    expect(await contract.publicAuctionStopped()).to.be.false;
                });
                it('Should prevent 0 tickets per wallet', async () => {
                    const {price, supply} = await defaultPublicAuctionParams();
                    await startPrivateAuction();
                    await stopPrivateAuction();
                    await expect(contract.startPublicAuction(price, supply, 0)).to.be.revertedWith('Requires at least 1 ticket per wallet');
                });
                it('Should set the correct ticket limit per wallet', async () => {
                    await startPrivateAuction();
                    await stopPrivateAuction();
                    await startPublicAuction();
                    expect(await contract.publicAuctionTicketsPerWallet()).to.equal(5);
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
                    expect(await contract.publicAuctionTickets()).to.equal(1);
                    expect(await contract.tickets()).to.equal(1);
                    await buyPublicAuction(price.mul(3));
                    expect(await contract.publicAuctionTickets()).to.equal(4);
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

            const levels = [3600, 7200, 10800, 14400, 18000];

            beforeEach(async () => {
                chainLinkContracts = await deployChainLink();
                contract = await deployAuction({
                    vrfCoordinator: chainLinkContracts.vrfCoordinator.address,
                    vrfWrapper: chainLinkContracts.vrfWrapper.address,
                    linkToken: chainLinkContracts.linkToken.address,
                }); // Redeploy contract for each test to ensure clean state
                const tx: ContractTransaction = await contract.whitelist((await getWhitelistedSigners()).map(s => s.address));
                await tx.wait();

                await setBalance(await contract.signer.getAddress(), ethers.utils.parseEther('100000'));
                const {price: privatePrice} = await defaultPrivateAuctionParams();
                const {price: publicPrice} = await defaultPublicAuctionParams();
                await contract.defineStakeLevels(levels);
                await startPrivateAuction({ticketsPerWallet: 5});
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
                    try {
                        await contract.stake(1);
                    } catch (e) {
                        fail(`Was not able to stake again ${e}`)
                    }
                });
                it('Should transfer token to contract', async () => {
                    await contract.requestReveal('https://test.example.com');
                    await contract.stake(1);
                    expect(await contract.ownerOf(1)).to.equal(contract.address);
                });
            });

            describe('unStake', async () => {
                it('Should not allow to unStake if not staked', async () => {
                    await contract.requestReveal('https://test.example.com');
                    await expect(contract.unStake(1)).to.be.revertedWith('Token has not been staked');

                });
                it('Should not allow to unStake if not owner of token', async () => {
                    const [, notOwner] = await ethers.getSigners();
                    await contract.requestReveal('https://test.example.com');
                    await contract.stake(1);

                    contract = contract.connect(notOwner);
                    await expect(contract.unStake(1)).to.be.revertedWith('Token does not belong to the sender wallet');
                });
                it('Should return the token to the original owner', async () => {
                    const [owner] = await ethers.getSigners();
                    await contract.requestReveal('https://test.example.com');
                    await contract.stake(1);
                    await contract.unStake(1);
                    expect(await contract.ownerOf(1)).to.equal(owner.address);

                });
                it('Should set the correct stake level', async () => {
                    await contract.requestReveal('https://test.example.com');
                    for (let i = 0; i < levels.length; ++i) {
                        const tokenId = i + 1;
                        await contract.stake(tokenId);
                        await increaseNextBlockTime(levels[i]);
                        await contract.unStake(tokenId);
                        expect(await contract.stakeLevel(tokenId)).to.equal(i + 1);
                    }
                });
            });
        });
    });
}

contractTests("AuctionV2Upgradeable", deployAuctionProxy);
contractTests("AuctionV2", deployAuction);
