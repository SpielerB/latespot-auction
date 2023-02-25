import React, {useEffect, useState} from 'react';
import "./MintPage.css"
import {mint, useContractModel, useMintError, useMintPending,} from "../../store/contract/ContractReducer";
import {useAppDispatch} from "../../store/Store";
import {BigNumber, ethers} from "ethers";
import {useAddress} from "../../hooks/WalletHooks";
import InfoDialog from "../InfoDialog";
import Mint from "../../model/Mint";
import MintButton from './MintButton';
import CrossMintButton from './CrossMintButton';
import {useAccount} from "wagmi";

interface AuctionProps {
    phase: number;
    mint?: Mint;
    title: String;
}

interface SalesProps {
    mint?: Mint;
    phase: number;
}

const MintHeader = (props: AuctionProps) => {
    const contractModel = useContractModel();
    const {isConnected} = useAccount();

    const isWhitelisted = contractModel?.whitelisted || contractModel?.publicMint.hasStarted;

    const tokensInWallet = contractModel?.balance ?? 0;
    const tokensMinted = props.mint?.tokensMinted ?? 0;
    const tokenSupply = props.mint?.tokenSupply ?? 0;
    const tokensRemaining = tokenSupply - tokensMinted;

    const ethPrice = ethers.utils.formatEther(props.mint?.price ?? 0);

    return (
        <div className="mint-header">
            <h4 className="mint-h4">phase #{props.phase}</h4>
            <h1 className="mint-h1">{props.title}</h1>
            {isConnected && isWhitelisted &&
                <div className={props.mint?.isActive ? "mint-header-p mint-mint" : "mint-header-p"}>
                    You currently have {tokensInWallet} {tokensInWallet == 1 ? "token" : "tokens"}.
                </div>
            }
            {props.mint?.isActive &&
                <h3 className="mint-h3">{tokensRemaining.toLocaleString('de-CH')} tokens left</h3>
            }
            {contractModel?.publicMint.hasStopped &&
                <h3 className="mint-h3 mint-mint">
                    thank you for your {tokensInWallet >= 1 ? "participation" : "interest"}!
                </h3>
            }
            {contractModel?.privateMint.hasStopped && !contractModel?.publicMint.hasStarted &&
                <h3 className="mint-h3 mint-mint">public mint will start any minute!</h3>
            }
            {props.mint?.isActive &&
                <div className="mint-live">
                    <img
                        src="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                        loading="lazy"
                        alt=""
                        className="mint-icon"
                    />
                    <div className="mint-live-p">Token Price: {ethPrice} $ETH</div>
                </div>
            }
        </div>
    );
}

const MintSalesForm = (props: SalesProps) => {
    const dispatch = useAppDispatch();
    const contractModel = useContractModel();
    const mintPending = useMintPending();
    const {isConnected} = useAccount();
    const mintError = useMintError();

    const [amount, setAmount] = useState<number>(1);
    const [showInfo, setShowInfo] = useState<boolean>(false);
    const [showError, setShowError] = useState<boolean>(false);

    const privateHasStopped = contractModel?.privateMint.hasStopped ?? false;
    const publicHasStopped = contractModel?.publicMint.hasStopped ?? false;
    const publicHasStarted = contractModel?.publicMint.hasStarted ?? false;
    const isWhitelisted = contractModel?.whitelisted || publicHasStarted;
    const maxTokensPerWallet = props.mint?.tokenLimit ?? 0;
    const tokenCount = props.mint?.walletTokens ?? 0;
    const maxTokens = maxTokensPerWallet - tokenCount;

    const price = BigNumber.from(props.mint?.price ?? "0");
    const ethPrice = ethers.utils.formatEther(price);
    const totalPrice = (+ethers.utils.formatEther(price.mul(amount))).toLocaleString('de-CH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3
    });

    let isEligible = false;
    let selectText;

    if (privateHasStopped && !publicHasStarted) {
        selectText = "whitelist mint finished";
    } else if (privateHasStopped && publicHasStopped) {
        selectText = "public mint finished!";
    } else if (!isConnected && !publicHasStarted) {
        selectText = "your wallet is not connected!";
    } else if (!isWhitelisted) {
        selectText = "your wallet is not whitelisted";
    } else if (maxTokensPerWallet === tokenCount) {
        selectText = "maximum number of tokens reached";
    } else {
        selectText = "select token amount";
        isEligible = true;
    }

    const mintDisabled = !isEligible || mintPending;

    let errorMessage = mintError;
    useEffect(() => {
        if (mintError) {
            setShowError(true);
        } else {
            setShowError(false);
        }
    }, [mintError])

    useEffect(() => {
        if (maxTokens < amount) {
            setAmount(maxTokens);
        }
        if (tokenCount == 0) {
            setAmount(1);
        }
    }, [maxTokens])

    return (
        <div className="mint-buy-c">
            <div className="mint-buy" aria-label="Mint Form">
                <h3 className="mint-buy-h3">how many tokens do you want to mint?</h3>
                <div className="mint-buy-amount-w">
                    <h4 className={isEligible ? "" : "mint-mint"}>{selectText}</h4>
                    <select
                        value={amount}
                        onChange={event => setAmount(+event.target.value)}
                        className="mint-amount"
                        disabled={mintDisabled}
                    >
                        {Array.from(Array(maxTokens).keys()).map((i) => (
                            <option className="option" key={`token-${i + 1}`} value={i + 1}>{i + 1}</option>
                        ))}
                        {maxTokens === 0 && <option value={0}>0</option>}
                    </select>
                </div>
                <div className="mint-buy-info">
                    Phase #{props.phase}: Max. {maxTokensPerWallet} tokens per wallet and transaction
                </div>
                {isEligible &&
                    <div>
                        <h3 className="mint-h3">summary:</h3>
                        <div className="mint-buy-summary">
                            {ethPrice} $ETH x {amount} {amount > 1 ? "tokens" : "token"} =
                            <span className="mint-buy-summary-bold"> {totalPrice} $ETH</span>
                        </div>
                    </div>
                }
                <div className="mint-buttons">
                    <MintButton
                        amount={amount}
                        onMint={() => setShowInfo(true)}
                        mintDisabled={mintDisabled}
                    />
                    <div className={mintDisabled ? "mint-button-spacer text-disabled" : "mint-button-spacer"}>or</div>
                    <CrossMintButton
                        amount={amount}
                        etherPrice={ethers.utils.formatEther(price.mul(amount).toString())}
                        disabled={mintDisabled}
                    />
                </div>
            </div>
            <InfoDialog
                iconSrc="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                title="confirmation"
                confirmLabel="accept and confirm mint"
                open={showInfo}
                cancelLabel="cancel mint"
                onConfirm={() => {
                    dispatch(mint(amount))
                    setShowInfo(false)
                }}
                onCancel={() => setShowInfo(false)}
            >
                <div className="dialog-text">
                    <h3 className="mint-mint">You are about to mint {amount} token(s)</h3>
                    <p>Please take a minute and read the following information carefully.</p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-mint">gas price</h3>
                    <p>
                        In addition to the price of the token, a gas fee is added by the transaction
                        on the Blockchain. The gas fee is not controlled by us and is subject to change.
                        Websites like&nbsp;
                        <a className="mint-link" href="https://etherscan.io/gastracker" target="blank">Etherscan</a>
                        &nbsp;can give you a rough overview of the current gas price.
                    </p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-mint">minting may take a while</h3>
                    <p>
                        The minting process may take a couple of minutes to finish based on the current
                        network usage. Please be patient and wait for the tokens to arrive in your wallet.
                    </p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-mint">confirmation</h3>
                    <p>
                        By clicking the "ACCEPT AND CONFIRM MINT" button, you confirm
                        that you have read and understood the presented information about the mint.
                    </p>
                </div>
            </InfoDialog>
            <InfoDialog
                iconSrc="https://prod.squirreldegens.com/warning.svg"
                title="error"
                confirmLabel="confirm"
                open={showError}
                onConfirm={() => setShowError(false)}
                onCancel={() => setShowError(false)}
            >
                {errorMessage}
            </InfoDialog>
        </div>);
}
const MintPage = (props: AuctionProps) => {
    const walletAddress = useAddress();
    const {isConnected} = useAccount();

    return (
        <div className="mint-section">
            <div className="mint-c">
                <MintHeader {...props}/>
                <MintSalesForm phase={props.phase} mint={props.mint}/>
            </div>
            <div className="mint-line"/>
            {isConnected &&
                <div className="mint-wallet">
                    <div className="mint-wallet-p">
                        <h3 className="mint-h3">connected wallet: </h3>
                        {walletAddress}
                    </div>
                </div>
            }
            {!isConnected &&
                <div className="mint-wallet">
                    <div className="mint-wallet-p">
                        <h3 className="mint-mint">no wallet connected </h3>
                        {walletAddress}
                    </div>
                </div>
            }
        </div>
    );
}
export default MintPage;