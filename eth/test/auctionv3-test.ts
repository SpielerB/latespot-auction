import {ethers} from 'hardhat';
import {BigNumber, BigNumberish, Contract, ContractReceipt, ContractTransaction, Wallet} from 'ethers';
import {createSignature, deploy, deployProxy, getBalance, setBalance, upgradeProxy} from './helper';
import {expect} from 'chai';
import {describe} from 'mocha';
import crypto from 'crypto';

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

interface InitV3Params {
    crossmintWallet: string;
    royaltiesRecipient: string;
}

interface PrivateMintParams {
    price: BigNumber;
    supply: BigNumber;
    tokensPerWallet: number;
}

interface PublicMintParams {
    price: BigNumber;
    supply: BigNumber;
    tokensPerWallet: number;
}

interface ChainLinkContracts {
    vrfCoordinator: Contract,
    vrfWrapper: Contract,
    linkToken: Contract
}

const defaultInitParams = async (): Promise<InitParams> => {
    const signers = await ethers.getSigners();
    return {
        tokenName: "AuctionV2To3",
        tokenSymbol: "AV2To3",
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

const defaultInitV3Params = async (): Promise<InitV3Params> => {
    const [owner] = await ethers.getSigners();
    return {
        crossmintWallet: "0xdab1a1854214684ace522439684a145e62505233",
        royaltiesRecipient: owner.address
    };
}

const defaultPrivateMintParams = async (): Promise<PrivateMintParams> => {
    return {
        price: ethers.utils.parseEther("1"),
        supply: BigNumber.from(2000),
        tokensPerWallet: 2
    }
}

const defaultPublicMintParams = async (): Promise<PrivateMintParams> => {
    return {
        price: ethers.utils.parseEther("2"),
        supply: BigNumber.from(8000),
        tokensPerWallet: 5
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

const deployAuctionV2Proxy = async (overrides?: Partial<InitParams>) => {
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

const upgradeContractV2ToV3 = async (address: string, v3overrides?: Partial<InitV3Params>) => {
    const defaultParams = await defaultInitV3Params();
    const contract = await upgradeProxy(address, "AuctionV3Upgradeable");
    await contract.initializeV3(
        wrapParam(v3overrides?.crossmintWallet, defaultParams.crossmintWallet),
        wrapParam(v3overrides?.royaltiesRecipient, defaultParams.royaltiesRecipient)
    );
    return contract;
};

const deployAuctionProxy = async (overrides?: Partial<InitParams>, v3overrides?: Partial<InitV3Params>) => {
    const contract = await deployAuctionV2Proxy(overrides);
    return await upgradeContractV2ToV3(contract.address, v3overrides);
};

const wrapParam = <T>(value: T | undefined, fallback: T) => {
    return value ?? fallback;
}

const getWhitelistedSigners = async () => (await ethers.getSigners()).filter((_, i) => i % 2 === 0);

const contractTests = (name: string, deployAuction: (overrides?: Partial<InitParams>) => Promise<Contract>) => {
    describe(name, async function () {

        let contract: Contract;
        let chainLinkContracts: ChainLinkContracts;

        const startPrivateMint = async (params?: Partial<PrivateMintParams>) => {
            const defaultParams = await defaultPrivateMintParams();
            const tx: ContractTransaction = await contract.startPrivateMint(
                wrapParam(params?.price, defaultParams.price),
                wrapParam(params?.supply, defaultParams.supply),
                wrapParam(params?.tokensPerWallet, defaultParams.tokensPerWallet)
            );
            await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
            return tx;
        }

        const privateMint = async (count: number, valueOverride?: BigNumberish) => {
            const price = await contract.privateMintPrice();
            const value = valueOverride ?? price.mul(count);
            const tx: ContractTransaction = await contract.privateMint(count, {value});
            await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
            return tx;
        }

        const stopPrivateMint = async () => {
            const tx: ContractTransaction = await contract.stopPrivateMint();
            await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
            return tx;
        }

        const startPublicMint = async (params?: Partial<PublicMintParams>) => {
            const defaultParams = await defaultPublicMintParams();
            const tx: ContractTransaction = await contract.startPublicMint(
                wrapParam(params?.price, defaultParams.price),
                wrapParam(params?.supply, defaultParams.supply),
                wrapParam(params?.tokensPerWallet, defaultParams.tokensPerWallet)
            );
            await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
            return tx;
        }

        const publicMint = async (count: number, valueOverride?: BigNumberish) => {
            const price = await contract.publicMintPrice();
            const value = valueOverride ?? price.mul(count);
            const tx: ContractTransaction = await contract.publicMint(count, {value});
            await tx.wait(); // Wait for the block to be mined to ensure that the transaction has either been rejected or went through
            return tx;
        }

        const stopPublicMint = async () => {
            const tx: ContractTransaction = await contract.stopPublicMint();
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

        context('Upgrade', async function () {

            it('Should keep existing values', async function () {
                const contract = await deployAuctionV2Proxy();
                const owner = await contract.owner();

                const wallets: Wallet[] = [];
                for (let i = 0; i < 50; ++i) {
                    const id = crypto.randomBytes(32).toString('hex');
                    const privateKey = "0x" + id;
                    const wallet = new ethers.Wallet(privateKey, ethers.provider);
                    await setBalance(wallet.address, ethers.utils.parseEther("1000"));
                    wallets.push(wallet);
                }
                await contract.defineStakeLevels([2592000, 5184000, 15552000]);

                await contract.whitelist(wallets.map(wallet => wallet.address));

                const price = ethers.utils.parseEther("0.24");

                await contract.startPrivateAuction(price, 2000, 2);
                for (let i = 0; i < 12; ++i) {
                    const wallet = wallets[i];
                    const walletContract = contract.connect(wallet);
                    if (i === 0 || i === 1) {
                        await walletContract.buyPrivateAuction(createSignature(wallet.address, price, "private"), {value: price})
                    }
                    if (i === 2) {
                        await walletContract.buyPrivateAuction(createSignature(wallet.address, price.mul(2), "private"), {value: price.mul(2)})
                    } else {
                        await walletContract.buyPrivateAuction(createSignature(wallet.address, price, "private"), {value: price})
                    }
                }

                await contract.preMint(15);

                let id = 1;
                for (let i = 0; i < 12; ++i) {
                    const wallet = wallets[i];
                    if (i === 0 || i === 1 || i === 2) {
                        await contract.transferFrom(owner, wallet.address, id++)
                    }
                    await contract.transferFrom(owner, wallet.address, id++)
                }

                await contract.stopPrivateAuction();

                const privateAuctionStarted = await contract.privateAuctionStarted();
                const privateAuctionTicketCount = await contract.privateAuctionTicketCount();
                const privateAuctionTicketSupply = await contract.privateAuctionTicketSupply();
                const privateAuctionStopped = await contract.privateAuctionStopped();

                const balances = [];
                const tokens = [];
                const privateAuctionTickets = [];
                for (let i = 0; i < wallets.length; ++i) {
                    const wallet = wallets[i];
                    balances.push(await contract.balanceOf(wallet.address));
                    const walletContract = contract.connect(wallet);
                    tokens.push(await walletContract.tokens());
                    privateAuctionTickets.push(await walletContract.privateAuctionTickets());
                }
                const upgradedContract = await upgradeContractV2ToV3(contract.address);

                expect(upgradedContract.address).to.equal(contract.address);
                expect(await getBalance(upgradedContract.address)).to.equal(await getBalance(contract.address));

                const upgradedBalances = [];
                const upgradedTokens = [];
                const upgradedPrivateAuctionTickets = [];
                for (let i = 0; i < wallets.length; ++i) {
                    const wallet = wallets[i];
                    const walletContract = upgradedContract.connect(wallet);
                    expect(await walletContract.whitelisted()).to.be.true;
                    expect(await upgradedContract.whitelistedWallet(wallet.address)).to.be.true;
                    upgradedBalances.push(await upgradedContract.balanceOf(wallet.address));
                    upgradedTokens.push(await walletContract.tokens());
                    const privateAuctionTickets = await walletContract.privateAuctionTickets();
                    upgradedPrivateAuctionTickets.push(privateAuctionTickets);
                    expect(await upgradedContract.privateAuctionTicketsOf(wallet.address)).to.equal(privateAuctionTickets);
                }

                expect(upgradedBalances).to.deep.equal(balances);
                expect(upgradedTokens).to.deep.equal(tokens);
                expect(upgradedPrivateAuctionTickets).to.deep.equal(privateAuctionTickets);

                expect(await upgradedContract.owner()).to.equal(owner);
                expect(await upgradedContract.privateAuctionStarted()).to.equal(privateAuctionStarted);
                expect(await upgradedContract.privateAuctionTicketCount()).to.equal(privateAuctionTicketCount);
                expect(await upgradedContract.privateAuctionTicketSupply()).to.equal(privateAuctionTicketSupply);
                expect(await upgradedContract.privateAuctionStopped()).to.equal(privateAuctionStopped);
            });
        });

        context('Initialize', async function () {

            it('Should have the correct owner after upgrade', async function () {
                const contract = await deployAuctionV2Proxy();
                expect(await contract.owner()).to.equal(contract.deployTransaction.from);
                await upgradeContractV2ToV3(contract.address);
                expect(await contract.owner()).to.equal(contract.deployTransaction.from);
            });
        });

        context('General Functions', async () => {

            context('tokenURI', function () {
                it('Should have default base URI if not revealed', async () => {
                    for (let i = 0; i < 10; ++i) {
                        expect(await contract.tokenURI(Math.ceil(Math.random() * 10000))).to.equal((await defaultInitParams()).baseURI);
                    }
                });

                it('Should have the updated URI if revealed', async () => {
                    await startPrivateMint({
                        supply: BigNumber.from(5),
                        price: BigNumber.from(1),
                        tokensPerWallet: 5
                    })
                    await privateMint(5);
                    await stopPrivateMint();
                    await startPublicMint({supply: BigNumber.from(5), price: BigNumber.from(1)})
                    await publicMint(5);
                    await stopPublicMint();

                    const baseURI = 'https://test.example.com';
                    await contract.requestReveal(baseURI);
                    const seed = await contract.seed();
                    const totalSupply = await contract.totalSupply();
                    const offset = seed % totalSupply;
                    for (let i = 1; i <= 10; ++i) {
                        const metaId = (i + offset) % totalSupply + 1;
                        expect(await contract.tokenURI(i)).to.equal(`${baseURI}/${metaId}.json`);
                    }
                });
            });
        });

        context('Owner Functions', async () => {

            context('withdraw', function () {

                it('Should allow for the owner to withdraw the balance of the contract', async () => {
                    const [owner] = await ethers.getSigners();

                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await stopPublicMint();
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

            context('whitelist', function () {

                it('Should have added the whitelisted addresses', async () => {
                    const signers = await ethers.getSigners();

                    const whitelist = signers.filter((_, i) => i % 2 === 0).map(s => s.address);

                    await (await contract.whitelist(whitelist)).wait();

                    for (let i = 0; i < signers.length; ++i) {
                        const walletContract = contract.connect(signers[i]);
                        const expectIt = expect(await walletContract.whitelisted());
                        const expectIt2 = expect(await contract.whitelistedWallet(signers[i].address));
                        if (i % 2 == 0) {
                            expectIt.to.be.true
                            expectIt2.to.be.true
                        } else {
                            expectIt.to.be.false
                            expectIt2.to.be.false
                        }
                    }
                });
            });

            context('requestReveal', function () {
                it('Should request a reveal from ChainLink', async () => {
                    await startPrivateMint({supply: BigNumber.from(1), price: BigNumber.from(1)});
                    await privateMint(1);
                    await stopPrivateMint();
                    await startPublicMint({supply: BigNumber.from(1), price: BigNumber.from(1)});
                    await publicMint(1);
                    await stopPublicMint();
                    await contract.requestReveal('https://test.example.com');
                    expect(await contract.revealed()).to.be.true;
                });
            });
        });

        context('Private Mint', async () => {
            describe('startPrivateMint', async () => {
                it('Should start the private mint', async () => {
                    await startPrivateMint();
                    expect(await contract.privateMintActive()).to.be.true;
                    expect(await contract.privateMintStarted()).to.be.true;
                    expect(await contract.privateMintStopped()).to.be.false;
                });

                it('Should prevent 0 tokens per wallet', async () => {
                    const {price, supply} = await defaultPublicMintParams();
                    await expect(contract.startPrivateMint(price, supply, 0)).to.be.revertedWith('Requires at least 1 token per wallet');
                });
                it('Should set the correct token limit per wallet', async () => {
                    await startPrivateMint();
                    expect(await contract.privateMintTokensPerWallet()).to.equal(2);
                });
                it('Should not start start the private mint again', async () => {
                    await startPrivateMint();
                    await expect(startPrivateMint()).to.be.revertedWith('Private mint has already been started');
                });
            });
            describe('privateMint', async () => {
                it('Should mint the requested amount of tokens', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint({tokensPerWallet: 5});
                    await privateMint(1);
                    expect(await contract.privateMintTokens()).to.equal(1);
                    expect(await contract.privateMintTokensOf(wallet.address)).to.equal(1);
                    expect(await contract.balanceOf(wallet.address)).to.equal(1);
                    await privateMint(3);
                    expect(await contract.privateMintTokens()).to.equal(4);
                    expect(await contract.privateMintTokensOf(wallet.address)).to.equal(4);
                    expect(await contract.balanceOf(wallet.address)).to.equal(4);
                });

                it('Should not allow to mint more than limit', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint({tokensPerWallet: 5});
                    await expect(privateMint(6)).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the private mint');
                    await privateMint(3);
                    await expect(privateMint(3)).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the private mint');
                    await privateMint(2);
                    await expect(privateMint(1)).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the private mint');
                });

                it('Should not allow to mint over supply', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint({supply: BigNumber.from(2), tokensPerWallet: 5});
                    await expect(privateMint(3)).to.be.revertedWith('There are not enough tokens left in the private mint');
                    await privateMint(2);
                    await expect(privateMint(1)).to.be.revertedWith('Private mint is not active');
                });

                it('Should not allow to mint after stopped', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await expect(privateMint(1)).to.be.revertedWith('Private mint is not active');
                });

                it('Should not allow wrong price', async () => {
                    const price = (await defaultPrivateMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await expect(privateMint(1, price.add(1))).to.be.revertedWith('Value has to be a multiple of the price');
                    await expect(privateMint(1, price.sub(1))).to.be.revertedWith('Value has to be a multiple of the price');
                    await expect(privateMint(1, 0)).to.be.revertedWith('Value has to be greater than 0');
                });

                it('Should not allow wrong count', async () => {
                    const price = (await defaultPrivateMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await expect(privateMint(1, price.mul(2))).to.be.revertedWith('Given count does not match provided value');
                    await expect(privateMint(0, price.sub(1))).to.be.revertedWith('At least 1 token has to be minted');
                });

                it('Should mint correct amount of tokens', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await privateMint(2);
                    expect(await contract.balanceOf(wallet.address)).to.equal(2);
                });
            });
            describe('stopPrivateMint', async () => {

                it('Should stop the private mint', async () => {
                    await startPrivateMint();
                    await stopPrivateMint();
                    expect(await contract.privateMintActive()).to.be.false;
                    expect(await contract.privateMintStarted()).to.be.true;
                    expect(await contract.privateMintStopped()).to.be.true;
                });
            });
        });

        context('Public Mint', async () => {
            describe('startPublicMint', async () => {
                it('Should not start the public mint before the private mint', async () => {
                    const {price, supply, tokensPerWallet} = await defaultPublicMintParams();
                    await expect(contract.startPublicMint(price, supply, tokensPerWallet)).to.be.revertedWith('Public mint must start after private mint');
                });
                it('Should not start the public mint if the private mint is active', async () => {
                    const {price, supply, tokensPerWallet} = await defaultPublicMintParams();
                    await startPrivateMint();
                    await expect(contract.startPublicMint(price, supply, tokensPerWallet)).to.be.revertedWith('Private mint is still active');
                });
                it('Should not start the public mint before the private mint has been cleaned up', async () => {
                    const {price, supply, tokensPerWallet} = await defaultPublicMintParams();
                    await startPrivateMint({supply: BigNumber.from(1), price: BigNumber.from(1)});
                    await privateMint(1);
                    await expect(contract.startPublicMint(price, supply, tokensPerWallet)).to.be.revertedWith('Private mint has to be cleaned up using the stopPrivateMint() function before starting the public mint');
                });
                it('Should start the public mint', async () => {
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    expect(await contract.publicMintActive()).to.be.true;
                    expect(await contract.publicMintStarted()).to.be.true;
                    expect(await contract.publicMintStopped()).to.be.false;
                });
                it('Should prevent 0 tokens per wallet', async () => {
                    const {price, supply} = await defaultPublicMintParams();
                    await startPrivateMint();
                    await stopPrivateMint();
                    await expect(contract.startPublicMint(price, supply, 0)).to.be.revertedWith('Requires at least 1 token per wallet');
                });
                it('Should set the correct token limit per wallet', async () => {
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    expect(await contract.publicMintTokensPerWallet()).to.equal(5);
                });
                it('Should not start the public mint again', async () => {
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await expect(startPublicMint()).to.be.revertedWith('Public mint has already been started');
                });
            });
            describe('publicMint', async () => {
                it('Should mint the requested amount of tokens', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await publicMint(1);
                    expect(await contract.publicMintTokens()).to.equal(1);
                    expect(await contract.balanceOf(wallet.address)).to.equal(1);
                    await publicMint(3);
                    expect(await contract.publicMintTokens()).to.equal(4);
                    expect(await contract.balanceOf(wallet.address)).to.equal(4);
                });

                it('Should not allow to mint more than limit', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await expect(publicMint(6)).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the public mint');
                    await publicMint(3);
                    await expect(publicMint(3)).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the public mint');
                    await publicMint(2);
                    await expect(publicMint(1)).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the public mint');
                });

                it('Should not allow to mint over total', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint({supply: BigNumber.from(2)});
                    await expect(publicMint(3)).to.be.revertedWith('There are not enough tokens left in the public mint');
                    await publicMint(2);
                    await expect(publicMint(1)).to.be.revertedWith('Public mint is not active');
                });

                it('Should not allow to mint after stopped', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await stopPublicMint();
                    await expect(publicMint(1)).to.be.revertedWith('Public mint is not active');
                });

                it('Should not allow wrong price', async () => {
                    const price = (await defaultPublicMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await expect(publicMint(1, price.add(1))).to.be.revertedWith('Value has to be a multiple of the price');
                    await expect(publicMint(1, price.sub(1))).to.be.revertedWith('Value has to be a multiple of the price');
                    await expect(publicMint(1, 0)).to.be.revertedWith('Value has to be greater than 0');
                });


                it('Should not allow wrong count', async () => {
                    const price = (await defaultPublicMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await expect(publicMint(1, price.mul(2))).to.be.revertedWith('Given count does not match provided value');
                    await expect(publicMint(0, price.sub(1))).to.be.revertedWith('At least 1 token has to be minted');
                });

                it('Should mint correct amount of tokens', async () => {
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();

                    await stopPrivateMint();
                    await startPublicMint();
                    await publicMint(5);
                    expect(await contract.balanceOf(wallet.address)).to.equal(5);
                });
            });
            describe('stopPublicMint', async () => {

                it('Should stop the public mint', async () => {
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await stopPublicMint();
                    expect(await contract.publicMintActive()).to.be.false;
                    expect(await contract.publicMintStarted()).to.be.true;
                    expect(await contract.publicMintStopped()).to.be.true;
                });
            });
        });

        context('crossmint', async () => {
            it('Should only allow the crossmint wallet to mint using the crossmint method', async () => {
                const [owner, wallet1] = await ethers.getSigners();
                contract = await deployAuctionV2Proxy();
                contract = await upgradeContractV2ToV3(contract.address, {crossmintWallet: owner.address});
                await startPrivateMint({price: BigNumber.from(1)});
                await contract.whitelist([owner.address]);
                await contract.crossmint(owner.address, 1, {value: 1});
                const walletContract = contract.connect(wallet1);
                await expect(walletContract.crossmint(owner.address, 1, {value: 1})).to.be.revertedWith("Only the crossmint wallet may use this function");

            });
        });

    });
}

contractTests("AuctionV3Upgradeable", deployAuctionProxy);
