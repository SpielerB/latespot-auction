import React from 'react';
import "./PrivateAuction.css"
import {
    buyTickets,
    useContractModel,
    usePendingTransaction,
    useTransactionError
} from "../../../store/contract/ContractReducer";
import {useAppDispatch} from "../../../store/Store";
import {BigNumber, ethers} from "ethers";


const PrivateAuction = () => {
    const dispatch = useAppDispatch();
    const contractModel = useContractModel();
    const pendingTransaction = usePendingTransaction();
    const contractError = useTransactionError();

    const ticketsSold = contractModel?.privateAuction.ticketsSold ?? 0;
    const ticketSupply = contractModel?.privateAuction.ticketSupply ?? 0;
    const soldString = ticketsSold.toLocaleString('de-CH');
    const supplyString = ticketSupply.toLocaleString('de-CH');
    const ethereum = ethers.utils.formatEther(BigNumber.from(contractModel?.privateAuction.price));

    return (
        <div className="mint-section">
            <div className="mint-c">
                <div className="mint-header">
                    <h4 className="mint-h4">phase 1</h4>
                    <h1 className="mint-h1">WHITELIST SALE</h1>
                    <h3 className="mint-h3">{soldString} / {supplyString} TICKETS LEFT </h3>
                    <div className="mint-live">
                        <img
                            src="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                            loading="lazy"
                            alt=""
                            className="mint-live-icon"
                        />
                        <div className="mint-live-p">
                            Ticket Price: 42 USD = {ethereum} ETH
                        </div>
                    </div>
                </div>

                <div className="upperRight">
                    <div>Whitelisted: {contractModel?.whitelisted ? "Yes" : "No"}</div>
                    <button onClick={() => dispatch(buyTickets(2))}>Buy</button>
                </div>
                <div>Pending Transaction: {pendingTransaction ? "Yes" : "No"}</div>
                <div>Contract Error: {contractError}</div>
            </div>
        </div>);
}
export default PrivateAuction;