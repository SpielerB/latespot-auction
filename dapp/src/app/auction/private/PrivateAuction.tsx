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

    return (
        <div className="mint-section">
            <div className="mint-c">
                <div className="mint-header">
                    <div>
                        <h4 className="mint-h4">phase 1</h4>
                        <h1 className="mint-h1">WHITELIST SALE</h1>
                        {contractModel?.privateAuction.ticketsSold} / {contractModel?.privateAuction.ticketSupply} TICKETS
                        LEFT <br/>
                        <img
                            src="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                            loading="lazy"
                            alt=""
                            className="mint-live-icon"
                        />
                        Ticket Price: 42 usd
                        = {ethers.utils.formatEther(BigNumber.from(contractModel?.privateAuction.price))} ETH
                    </div>
                    <div className="upperRight">
                        <div>Whitelisted: {contractModel?.whitelisted ? "Yes" : "No"}</div>
                        <button onClick={() => dispatch(buyTickets(2))}>Buy</button>
                    </div>
                </div>
                <div>Pending Transaction: {pendingTransaction ? "Yes" : "No"}</div>
                <div>Contract Error: {contractError}</div>
            </div>
        </div>);
}
export default PrivateAuction;