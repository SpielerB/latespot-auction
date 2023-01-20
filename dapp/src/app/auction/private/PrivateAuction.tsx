import React from 'react';
import "./PrivateAuction.css"
import {
    buyTickets, useContractMetadata,
    useContractModel,
    usePendingTransaction,
    useTransactionError
} from "../../../store/contract/ContractReducer";
import {useAppDispatch} from "../../../store/Store";
import {BigNumber, ethers} from "ethers";


const PrivateAuction = () => {
    const dispatch = useAppDispatch();
    const contractModel = useContractModel();
    const contractMetadata = useContractMetadata();
    const pendingTransaction = usePendingTransaction();
    const contractError = useTransactionError();

    const ticketsSold = contractModel?.privateAuction.ticketsSold ?? 0;
    const ticketSupply = contractModel?.privateAuction.ticketSupply ?? 0;
    const soldString = ticketsSold.toLocaleString('de-CH');
    const supplyString = ticketSupply.toLocaleString('de-CH');
    const ethereum = ethers.utils.formatEther(BigNumber.from(contractModel?.privateAuction.price));

    const ticketsInWallet = contractModel?.walletTickets ?? 0;
    const walletAddress = contractMetadata.contractAddress ?? 'No wallet connected';

    return (
        <div className="mint-section">
            <div className="mint-c">
                <div className="mint-header">
                    <h4 className="mint-h4">phase 1</h4>
                    <h1 className="mint-h1">WHITELIST SALE</h1>
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
                            Ticket Price: 42 USD = {ethereum} ETH
                        </div>
                    </div>
                </div>

                <div className="unfinished">
                    <div>Whitelisted: {contractModel?.whitelisted ? "Yes" : "No"}</div>
                    <button onClick={() => dispatch(buyTickets(2))}>Buy</button>
                </div>
                <div>Pending Transaction: {pendingTransaction ? "Yes" : "No"}</div>
                <div>Contract Error: {contractError}</div>
            </div>
            <div className="mint-line"/>

            <div className="mint-wallet">
                <div className="mint-wallet-p"><h3 className="mint-h3">CONNECTED WALLET: </h3>{walletAddress}</div>
            </div>
            <div className="mint-info">
                <h3 className="mint-h3">ERC-721S BENEFITS</h3>
                <p className="mint-info-p">
                    You will only have to claim the tickets. Every other cost to mint the NFT is paid by our team
                    through the ERC-721S contract. We will bunk mint all NFTs after a maximum of 96 hours.
                </p>
            </div>

        </div>);
}
export default PrivateAuction;