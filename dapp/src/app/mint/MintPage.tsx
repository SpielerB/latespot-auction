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

    const tokenInWallet = contractModel?.balance ?? 0;
    const tokenSold = props.mint?.tokensMinted ?? 0;
    const tokenSupply = props.mint?.tokenSupply ?? 0;
    const tokenStock = tokenSupply - tokenSold;
    const stockString = tokenStock.toLocaleString('de-CH');

    const ethPrice = ethers.utils.formatEther(props.mint?.price ?? 0);

    return (
        <div className="mint-header">
            <h4 className="mint-h4">phase #{props.phase}</h4>
            <h1 className="mint-h1">{props.title}</h1>
            {isConnected && isWhitelisted &&
                <div className={props.mint?.isActive ? "mint-header-p mint-mint" : "mint-header-p"}>
                    You currently have {tokenInWallet} {tokenInWallet == 1 ? "token" : "tokens"}.
                </div>
            }
            {props.mint?.isActive && <h3 className="mint-h3">{stockString} Tokens LEFT </h3>}
            {contractModel?.publicMint.hasStopped &&
                <h3 className="mint-h3 mint-mint">Thank you for your {tokenInWallet >= 1 ? "participation" : "interest"}!</h3>}
            {contractModel?.privateMint.hasStopped && !contractModel?.publicMint.hasStarted &&
                <h3 className="mint-h3 mint-mint">public mint will start any minute!</h3>}
            {props.mint?.isActive &&
                <div className="mint-live">
                    <img
                        src="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                        loading="lazy"
                        alt=""
                        className="mint-icon"
                    />
                    <div className="mint-live-p">
                        Token Price: {ethPrice} $ETH
                    </div>
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
    const price = BigNumber.from(props.mint?.price ?? "0");
    const ethPrice = ethers.utils.formatEther(price);
    const totalPrice = (+ethers.utils.formatEther(price.mul(amount))).toLocaleString('de-CH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3
    });

    const privateHasStopped = contractModel?.privateMint.hasStopped ?? false;
    const publicHasStopped = contractModel?.publicMint.hasStopped ?? false;
    const publicHasStarted = contractModel?.publicMint.hasStarted ?? false;
    const isWhitelisted = contractModel?.whitelisted || publicHasStarted;
    const maxTokensPerWallet = props.mint?.tokenLimit ?? 0;
    const tokenCount = props.mint?.walletTokens ?? 0;
    const maxToken = maxTokensPerWallet - tokenCount;

    let isEligible;
    let selectText;

    if (privateHasStopped && !publicHasStarted) {
        isEligible = false;
        selectText = "whitelist MINT FINISHED";
    } else if (privateHasStopped && publicHasStopped) {
        isEligible = false;
        selectText = "public MINT FINISHED!";
    } else if (!isConnected && !publicHasStarted) {
        selectText = "Your wallet is not connected!";
        isEligible = false;
    } else if (!isWhitelisted) {
        selectText = "YOUR WALLET IS NOT WHITELISTED";
        isEligible = false;
    } else if (maxTokensPerWallet === tokenCount) {
        selectText = "MAXIMUM NUMBER OF TOKENS REACHED";
        isEligible = false;
    } else {
        selectText = "SELECT TOKEN AMOUNT";
        isEligible = true;
    }

    let errorMessage = mintError;

    useEffect(() => {
        if (mintError) {
            setShowError(true);
        } else {
            setShowError(false);
        }
    }, [mintError])

    useEffect(() => {
        if (maxToken < amount) {
            setAmount(maxToken);
        }
        if (tokenCount == 0) {
            setAmount(1);
        }
    }, [maxToken])

    return (
        <div className="mint-buy-c">
            <div className="mint-buy" aria-label="Mint Form">
                <h3 className="mint-buy-h3">HOW MANY Tokens DO YOU WANT TO mint?</h3>
                <div className="mint-buy-amount-w">
                    <h4 className={isEligible ? "" : "mint-mint"}>{selectText}</h4>
                    <select
                        value={amount}
                        onChange={event => setAmount(+event.target.value)}
                        className="mint-amount"
                        disabled={!isEligible || mintPending}
                    >
                        {Array.from(Array(maxToken).keys()).map((i) =>
                            <option className="option" key={`token-${i + 1}`} value={i + 1}>
                                {i + 1}
                            </option>)}
                        {maxToken === 0 && <option value={0}>0</option>}
                    </select>
                </div>
                <div className="mint-buy-info">Phase #{props.phase}: Max. {maxTokensPerWallet} tokens per wallet and
                    transaction
                </div>
                {isEligible && <>
                    <h3 className="mint-h3">summary:</h3>
                    <div className="mint-buy-summary">
                        {ethPrice} $ETH x {amount} {amount > 1 ? "tokens" : "token"} =
                        <span className="mint-buy-summary-bold"> {totalPrice} $ETH</span>
                    </div>
                </>}
                <div className="mint-buttons">
                    <MintButton
                        amount={amount}
                        onMint={() => setShowInfo(true)}
                        mintDisabled={!isEligible || mintPending}
                    />
                    <div
                        className={!isEligible || mintPending ? "mint-button-spacer text-disabled" : "mint-button-spacer"}>or
                    </div>
                    <CrossMintButton
                        amount={amount}
                        etherPrice={ethers.utils.formatEther(price.mul(amount).toString())}
                        disabled={!isEligible || mintPending}
                    />
                </div>
            </div>
            <InfoDialog
                iconSrc="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                title="Confirmation"
                confirmLabel="Accept and Confirm mint"
                open={showInfo}
                cancelLabel="Cancel mint"
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
                    <h3 className="mint-mint">Gas Price</h3>
                    <p>In addition to the price of the token, a gas fee is added by the transaction
                        on the Blockchain. The gas fee is not controlled by us and is subject to change.
                        Websites like <a className="mint-link" href="https://etherscan.io/gastracker"
                                         target="blank">Etherscan</a> can give you a
                        rough overview of the current gas price.
                    </p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-mint">minting may take a while</h3>
                    <p>The minting process may take a couple of minutes to finish based on the current
                        network usage. Please be patient and wait for the tokens to arrive in your wallet.
                    </p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-mint">Confirmation</h3>
                    <p>By clicking the "ACCEPT AND CONFIRM MINT" button, you confirm
                        that you have read and understood the presented information about the mint.</p>
                </div>
            </InfoDialog>
            <InfoDialog
                iconSrc="https://prod.squirreldegens.com/warning.svg"
                title="Error"
                confirmLabel="Confirm"
                open={showError}
                onConfirm={() => {
                    setShowError(false)
                }}
                onCancel={() => setShowError(false)}
            >{errorMessage}</InfoDialog>
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
                        <h3 className="mint-h3">CONNECTED WALLET: </h3>
                        {walletAddress}
                    </div>
                </div>
            }
            {!isConnected &&
                <div className="mint-wallet">
                    <div className="mint-wallet-p">
                        <h3 className="mint-mint">No wallet connected </h3>
                        {walletAddress}
                    </div>
                </div>
            }
        </div>);
}
export default MintPage;