import React, {useEffect, useState} from 'react';
import "./AuctionPage.css"
import {
    buyTickets, useBuyTransaction,
    useContractModel,
} from "../../store/contract/ContractReducer";
import {useAppDispatch} from "../../store/Store";
import {BigNumber, ethers} from "ethers";
import {useAddress} from "../../hooks/WalletHooks";
import InfoDialog from "../InfoDialog";
import Auction from "../../model/Auction";


interface AuctionProps {
    phase: number;
    auction?: Auction;
    title: String;
}

interface SalesProps {
    auction?: Auction;
}

const MintHeader = (props: AuctionProps) => {
    const contractModel = useContractModel();
    const ticketsInWallet = contractModel?.walletTickets ?? 0;

    const ticketsSold = props.auction?.ticketsSold ?? 0;
    const ticketSupply = props.auction?.ticketSupply ?? 0;
    const soldString = ticketsSold.toLocaleString('de-CH');
    const supplyString = ticketSupply.toLocaleString('de-CH');
    const ethereum = ethers.utils.formatEther(BigNumber.from(props.auction?.price));


    return (
        <div className="mint-header">
            <h4 className="mint-h4">phase #{props.phase}</h4>
            <h1 className="mint-h1">{props.title}</h1>
            <div className="mint-mint-p">
                You currently have {ticketsInWallet} tickets.
            </div>
            <h3 className="mint-h3">{soldString} / {supplyString} TICKETS LEFT </h3>
            <div className="mint-live">
                <img
                    src="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                    loading="lazy"
                    alt=""
                    className="mint-icon"
                />
                <div className="mint-live-p">
                    Ticket Price: 42 USD = {ethereum} $ETH
                </div>
            </div>
        </div>
    );
}

const MintSalesForm = (props: SalesProps) => {
    const dispatch = useAppDispatch();
    const contractModel = useContractModel();
    const transaction = useBuyTransaction();

    const [amount, setAmount] = useState<number>(1);
    const [showInfo, setShowInfo] = useState<boolean>(false);
    const [showError, setShowError] = useState<boolean>(false);
    const price = BigNumber.from(props.auction?.price);
    const ethereum = ethers.utils.formatEther(price);
    const totalPrice = (+ethers.utils.formatEther(price.mul(amount))).toLocaleString('de-CH', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });

    const isWhitelisted = contractModel?.whitelisted || contractModel?.publicAuction.hasStarted;
    const hasStopped = props.auction?.hasStopped ?? false;
    const maxTicketsPerWallet = props.auction?.ticketLimit ?? 0;
    const ticketCount = props.auction?.walletTickets ?? 0;
    const maxTickets = maxTicketsPerWallet - ticketCount;

    let isEligible;
    let selectText;
    if (!isWhitelisted) {
        selectText = "YOUR WALLET IS NOT WHITELISTED";
        isEligible = false;
    } else if (hasStopped) {
        isEligible = false;
        selectText = "SOLD OUT!";
    } else if (maxTicketsPerWallet === ticketCount) {
        selectText = "MAXIMUM NUMBER OF TICKETS REACHED";
        isEligible = false;
    } else {
        selectText = "SELECT AMOUNT (1 TICKET = 1 NFT)";
        isEligible = true;
    }

    const buttonText = () => {
        if (transaction?.pending) {
            return "Pending..."
        } else {
            return amount > 1 ? `Buy ${amount} tickets` : "Buy ticket"
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
        if(maxTickets < amount){
            setAmount(maxTickets);
        }
    }, [maxTickets])

    return (
        <div className="mint-buy-c">
            <div className="mint-buy" aria-label="Buy Form">
                <h3 className="mint-buy-h3">HOW MANY TICKETS DO YOU WANT TO BUY?</h3>
                <div className="mint-buy-amount-w">
                    <h4 className={isEligible ? "" : "mint-buy-h4"}>{selectText}</h4>
                    <select
                        value={amount}
                        onChange={event => setAmount(+event.target.value)}
                        className="mint-amount"
                        disabled={!isEligible || transaction?.pending}
                    >
                        {Array.from(Array(maxTickets).keys()).map((i) =>
                            <option className="option" key={`ticket-${i + 1}`} value={i + 1}>
                                {i + 1}
                            </option>)}
                        {maxTickets === 0 && <option value={0}>0</option>}
                    </select>
                </div>

                <div className="mint-buy-info">Phase #1: Max. {maxTicketsPerWallet} tickets per wallet
                </div>
                {isEligible && <>
                    <h3 className="mint-h3">summary:</h3>
                    <div className="mint-buy-summary">
                        {ethereum} $ETH x {amount} {amount > 1 ? "tickets" : "ticket"} =
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
                contentText={["Time Wait", "Gas Gas"]}
                confirmLabel="Confirm purchase"
                open={showInfo}
                cancelLabel="Cancel purchase"
                onConfirm={() => {
                    dispatch(buyTickets(amount))
                    setShowInfo(false)
                }}
                onCancel={() => setShowInfo(false)}
            />
            <InfoDialog
                iconSrc="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                title="Error"
                contentText={[errorMessage]}
                confirmLabel="Confirm"
                open={showError}
                onConfirm={() => {
                    setShowError(false)
                }}
                onCancel={() => setShowError(false)}
            />
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
                <h3 className="mint-h3">ERC-721S BENEFITS</h3>
                <p className="mint-info-p">
                    You will only have to buy the tickets. Every other cost to mint the NFT is paid by our team
                    through the ERC-721S contract. We will bunk mint all NFTs after a maximum of 96 hours.
                </p>
            </div>
        </div>);
}
export default AuctionPage;