import {ethers} from 'hardhat';
import {BigNumber, BigNumberish, Contract, ContractReceipt, ContractTransaction, Wallet} from 'ethers';
import {
    createSignature,
    deploy,
    deployProxy,
    getBalance,
    increaseNextBlockTime,
    setBalance,
    upgradeProxy
} from './helper';
import {expect} from 'chai';
import {describe} from 'mocha';
import {fail} from 'assert';
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

const upgradeContractV2ToV3 = async (address: string) => {
    return await upgradeProxy(address, "AuctionV3Upgradeable");
};

const deployAuctionProxy = async (overrides?: Partial<InitParams>) => {
    const contract = await deployAuctionV2Proxy(overrides);
    return await upgradeContractV2ToV3(contract.address);
};

const wrapParam = <T>(value: T | undefined, fallback: T) => {
    if (value === undefined) return fallback;
    return value;
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

        const privateMint = async (value: BigNumberish, signature?: string) => {
            if (signature === undefined) {
                const address = await contract.signer.getAddress();
                const signatureSigner = await ethers.getSigner(await contract.signatureAddress());
                signature = await createSignature(address, value, 'private', signatureSigner);
            }

            const tx: ContractTransaction = await contract.privateMint(signature, {value});
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

        const publicMint = async (value: BigNumberish, signature?: string) => {
            if (signature === undefined) {
                const address = await contract.signer.getAddress();
                const signatureSigner = await ethers.getSigner(await contract.signatureAddress());
                signature = await createSignature(address, value, 'public', signatureSigner);
            }

            const tx: ContractTransaction = await contract.publicMint(signature, {value});
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

                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await stopPublicMint();
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

                it('Should not allow to withdraw if mint is not over', async () => {
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await expect(contract.withdraw()).to.be.revertedWith('');
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
                    await contract.defineStakeLevels([10000]);
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
                    const price = (await defaultPrivateMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint({tokensPerWallet: 5});
                    await privateMint(price);
                    expect(await contract.privateMintTokens()).to.equal(1);
                    expect(await contract.privateMintTokensOf(wallet.address)).to.equal(1);
                    expect(await contract.balanceOf(wallet.address)).to.equal(1);
                    await privateMint(price.mul(3));
                    expect(await contract.privateMintTokens()).to.equal(4);
                    expect(await contract.privateMintTokensOf(wallet.address)).to.equal(4);
                    expect(await contract.balanceOf(wallet.address)).to.equal(4);
                });

                it('Should not allow to mint more than limit', async () => {
                    const price = (await defaultPrivateMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint({tokensPerWallet: 5});
                    await expect(privateMint(price.mul(6))).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the private mint');
                    await privateMint(price.mul(3));
                    await expect(privateMint(price.mul(3))).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the private mint');
                    await privateMint(price.mul(2));
                    await expect(privateMint(price)).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the private mint');
                });

                it('Should not allow to mint over supply', async () => {
                    const price = (await defaultPrivateMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint({supply: BigNumber.from(2), tokensPerWallet: 5});
                    await expect(privateMint(price.mul(3))).to.be.revertedWith('There are not enough tokens left in the private mint');
                    await privateMint(price.mul(2));
                    await expect(privateMint(price)).to.be.revertedWith('Private mint is not active');
                });

                it('Should not allow to mint after stopped', async () => {
                    const price = (await defaultPrivateMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await expect(privateMint(price)).to.be.revertedWith('Private mint is not active');
                });

                it('Should not allow wrong signature', async () => {
                    const price = (await defaultPrivateMintParams()).price;
                    const [wallet, otherWallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await expect(privateMint(price, await createSignature(wallet.address, 2, 'unknown'))).to.be.revertedWith('Invalid signature');
                    await expect(privateMint(price, await createSignature(otherWallet.address, price, 'private'))).to.be.revertedWith('Invalid signature');
                    await expect(privateMint(price, await createSignature(wallet.address, price, 'private', otherWallet))).to.be.revertedWith('Invalid signature');
                    await expect(privateMint(price, await createSignature(wallet.address, 2, 'private'))).to.be.revertedWith('Invalid signature');
                    await expect(privateMint(price, await createSignature(wallet.address, price, 'unknown'))).to.be.revertedWith('Invalid signature');
                });

                it('Should not allow wrong price', async () => {
                    const price = (await defaultPrivateMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await expect(privateMint(price.add(1))).to.be.revertedWith('Value has to be a multiple of the price');
                    await expect(privateMint(price.sub(1))).to.be.revertedWith('Value has to be a multiple of the price');
                    await expect(privateMint(0)).to.be.revertedWith('Value has to be greater than 0');
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
                    const price = (await defaultPublicMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await publicMint(price);
                    expect(await contract.publicMintTokens()).to.equal(1);
                    expect(await contract.balanceOf(wallet.address)).to.equal(1);
                    await publicMint(price.mul(3));
                    expect(await contract.publicMintTokens()).to.equal(4);
                    expect(await contract.balanceOf(wallet.address)).to.equal(4);
                });

                it('Should not allow to mint more than limit', async () => {
                    const price = (await defaultPublicMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await expect(publicMint(price.mul(6))).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the public mint');
                    await publicMint(price.mul(3));
                    await expect(publicMint(price.mul(3))).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the public mint');
                    await publicMint(price.mul(2));
                    await expect(publicMint(price)).to.be.revertedWith('Total token count is higher than the max allowed tokens per wallet for the public mint');
                });

                it('Should not allow to mint over total', async () => {
                    const price = (await defaultPublicMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint({supply: BigNumber.from(2)});
                    await expect(publicMint(price.mul(3))).to.be.revertedWith('There are not enough tokens left in the public mint');
                    await publicMint(price.mul(2));
                    await expect(publicMint(price)).to.be.revertedWith('Public mint is not active');
                });

                it('Should not allow to mint after stopped', async () => {
                    const price = (await defaultPublicMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await stopPublicMint();
                    await expect(publicMint(price)).to.be.revertedWith('Public mint is not active');
                });

                it('Should not allow wrong signature', async () => {
                    const price = (await defaultPublicMintParams()).price;
                    const [wallet, otherWallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await expect(publicMint(price, await createSignature(wallet.address, 2, 'unknown'))).to.be.revertedWith('Invalid signature');
                    await expect(publicMint(price, await createSignature(otherWallet.address, price, 'public'))).to.be.revertedWith('Invalid signature');
                    await expect(publicMint(price, await createSignature(wallet.address, price, 'public', otherWallet))).to.be.revertedWith('Invalid signature');
                    await expect(publicMint(price, await createSignature(wallet.address, 2, 'public'))).to.be.revertedWith('Invalid signature');
                    await expect(publicMint(price, await createSignature(wallet.address, price, 'unknown'))).to.be.revertedWith('Invalid signature');
                });

                it('Should not allow wrong price', async () => {
                    const price = (await defaultPublicMintParams()).price;
                    const [wallet] = await ethers.getSigners();
                    await setBalance(wallet.address, ethers.utils.parseEther("10000"));
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await expect(publicMint(price.add(1))).to.be.revertedWith('Value has to be a multiple of the price');
                    await expect(publicMint(price.sub(1))).to.be.revertedWith('Value has to be a multiple of the price');
                    await expect(publicMint(0)).to.be.revertedWith('Value has to be greater than 0');
                });
            });
            describe('stopPublicMint', async () => {

                it('Should stop the public mint', async () => {
                    await startPrivateMint();
                    await stopPrivateMint();
                    await startPublicMint();
                    await publicMint((await defaultPublicMintParams()).price)
                    await stopPublicMint();
                    expect(await contract.publicMintActive()).to.be.false;
                    expect(await contract.publicMintStarted()).to.be.true;
                    expect(await contract.publicMintStopped()).to.be.true;
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
                const {price: privatePrice} = await defaultPrivateMintParams();
                const {price: publicPrice} = await defaultPublicMintParams();
                await contract.defineStakeLevels(levels);
                await startPrivateMint({tokensPerWallet: 5});
                await privateMint(privatePrice.mul(5));
                await stopPrivateMint();
                await startPublicMint();
                await publicMint(publicPrice.mul(5));
                await stopPublicMint();
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

contractTests("AuctionV3Upgradeable", deployAuctionProxy);
