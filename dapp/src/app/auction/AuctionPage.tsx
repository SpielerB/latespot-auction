import React, {useEffect, useState} from 'react';
import "./AuctionPage.css"
import {mint, useMintTransaction, useContractModel,} from "../../store/contract/ContractReducer";
import {useAppDispatch} from "../../store/Store";
import {BigNumber, ethers} from "ethers";
import {useAddress} from "../../hooks/WalletHooks";
import InfoDialog from "../InfoDialog";
import Mint from "../../model/Mint";


interface AuctionProps {
    phase: number;
    auction?: Mint;
    title: String;
}

interface SalesProps {
    auction?: Mint;
}

const MintHeader = (props: AuctionProps) => {
    const contractModel = useContractModel();
    const tokenInWallet = contractModel?.mintedTokens ?? 0;

    const tokenSold = props.auction?.tokensMinted ?? 0;
    const tokenSupply = props.auction?.tokenSupply ?? 0;
    const tokenStock = tokenSupply - tokenSold;
    const stockString = tokenStock.toLocaleString('de-CH');

    const ethPrice = ethers.utils.formatEther(props.auction?.price ?? 0);

    return (
        <div className="mint-header">
            <h4 className="mint-h4">phase #{props.phase}</h4>
            <h1 className="mint-h1">{props.title}</h1>
            <div className="mint-mint-p">
                You currently have {tokenInWallet} {tokenInWallet == 1 ? "token" : "tokens"}.
            </div>
            <h3 className="mint-h3">{stockString} Tokens LEFT </h3>
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
        </div>
    );
}

const MintSalesForm = (props: SalesProps) => {
    const dispatch = useAppDispatch();
    const contractModel = useContractModel();
    const transaction = useMintTransaction();

    const [amount, setAmount] = useState<number>(1);
    const [showInfo, setShowInfo] = useState<boolean>(false);
    const [showError, setShowError] = useState<boolean>(false);
    const price = BigNumber.from(props.auction?.price ?? "0");
    const ethPrice = ethers.utils.formatEther(price);
    const totalPrice = (+ethers.utils.formatEther(price.mul(amount))).toLocaleString('de-CH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3
    });

    const isWhitelisted = contractModel?.whitelisted || contractModel?.publicMint.hasStarted;
    const hasStopped = props.auction?.hasStopped ?? false;
    const maxTokensPerWallet = props.auction?.tokenLimit ?? 0;
    const tokenCount = props.auction?.walletTokens ?? 0;
    const maxToken = maxTokensPerWallet - tokenCount;

    let isEligible;
    let selectText;
    if (!isWhitelisted) {
        selectText = "YOUR WALLET IS NOT WHITELISTED";
        isEligible = false;
    } else if (hasStopped) {
        isEligible = false;
        selectText = "SOLD OUT!";
    } else if (maxTokensPerWallet === tokenCount) {
        selectText = "MAXIMUM NUMBER OF Tokens REACHED";
        isEligible = false;
    } else {
        selectText = "SELECT NFT AMOUNT";
        isEligible = true;
    }

    const buttonText = () => {
        if (transaction?.pending) {
            return "Pending..."
        } else {
            return amount > 1 ? `Mint ${amount} Tokens` : "Mint Tokens"
        }
    }

    let errorMessage = transaction?.error && transaction.errorMessage
        || "An unidentified error occurred, please try again.";

    useEffect(() => {
        if (transaction?.error) {
            setShowError(true);
        } else {
            setShowError(false);
        }
    }, [transaction?.error])

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
                    <h4 className={isEligible ? "" : "mint-buy-h4"}>{selectText}</h4>
                    <select
                        value={amount}
                        onChange={event => setAmount(+event.target.value)}
                        className="mint-amount"
                        disabled={!isEligible || transaction?.pending}
                    >
                        {Array.from(Array(maxToken).keys()).map((i) =>
                            <option className="option" key={`token-${i + 1}`} value={i + 1}>
                                {i + 1}
                            </option>)}
                        {maxToken === 0 && <option value={0}>0</option>}
                    </select>
                </div>

                <div className="mint-buy-info">Phase #1: Max. {maxTokensPerWallet} tokens per wallet
                </div>
                {isEligible && <>
                    <h3 className="mint-h3">summary:</h3>
                    <div className="mint-buy-summary">
                        {ethPrice} $ETH x {amount} {amount > 1 ? "tokens" : "token"} =
                        <span className="mint-buy-summary-bold"> {totalPrice} $ETH</span>
                    </div>
                </>}
                <button onClick={() => setShowInfo(true)} type="submit" className="mint-button w-button"
                        disabled={!isEligible || transaction?.pending}>
                    {buttonText()}
                </button>
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
                    <h3 className="mint-mint-h3">You are about to mint {amount} token(s)</h3>
                    <p>Please take a minute and read the following information carefully.</p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-mint-h3">Gas Price</h3>
                    <p>In addition to the price of the token, a gas fee is added by the transaction
                        on the Blockchain. The gas fee is not controlled by us and is subject to change.
                        Websites like <a className="mint-link" href="https://etherscan.io/gastracker"
                                         target="blank">Etherscan</a> can give you a
                        rough overview of the current gas price.
                    </p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-mint-h3">minting may take a while</h3>
                    <p>The minting process may take a couple of minutes to finish based on the current
                        network usage. Please be patient and wait for the tokens to arrive in your wallet.
                    </p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-mint-h3">Confirmation</h3>
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
const AuctionPage = (props: AuctionProps) => {
    const walletAddress = useAddress();

    return (
        <div className="mint-section">
            <div className="mint-c">
                <MintHeader {...props}/>
                <MintSalesForm auction={props.auction}/>
            </div>
            <div className="mint-line"/>

            <div className="mint-wallet">
                <div className="mint-wallet-p"><h3 className="mint-h3">CONNECTED WALLET: </h3>{walletAddress}</div>
            </div>
            <div className="mint-info">
                <h3 className="mint-h3">ERC-721S</h3>
                <p className="mint-info-p">
                    We programmed the contract based on the ERC-721 standards.
                    We call it the ERC-721S contract (S for Squirrels).
                </p>
            </div>
        </div>);
}
export default AuctionPage;