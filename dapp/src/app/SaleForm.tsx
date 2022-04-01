import React, {useCallback, useEffect, useState} from 'react';
import ContractData from './model/ContractData';
import {Contract, ethers, Signer} from 'ethers';
import {buyTickets, hasAuctionEnded} from '../helper/ContractHelper';

import './SaleForm.css'

interface BuyFormProps {
    contractData: ContractData;
    contract: Contract;
    signer: Signer;
}

const getBuyMessage = (contractData: ContractData, amount: number, maxTickets: number) => {
    if (contractData.currentPhase === 2 && !contractData.walletData.whitelisted) return 'You are not whitelisted';
    if (contractData.currentPhase === 0 || hasAuctionEnded(contractData)) return 'No ongoing phase';
    if (contractData.currentPhaseData.ticketCount === contractData.currentPhaseData.ticketSupply) return 'No tickets left in the current phase';
    if(maxTickets === 0 || amount > maxTickets) return 'You already bought the maximum amount of tickets on this wallet';
    return undefined;
}

const SaleForm = ({contractData, contract, signer}: BuyFormProps) => {
    const [isBuying, setIsBuying] = useState<boolean>(false);
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<boolean>();

    const phase = contractData.currentPhase;

    const maxTicketsPerWallet = contractData.currentPhaseData.ticketsPerWallet;
    const ticketCount = contractData.walletData.phaseTickets;
    const maxTickets = maxTicketsPerWallet - ticketCount;

    const [amount, setAmount] = useState<number>(1);
    useEffect(() => {
        if (maxTickets < amount) setAmount(maxTickets);
        if (amount === 0 && maxTickets !== 0) setAmount(1);
    }, [maxTickets, amount]);


    useEffect(() => {
        console.log('Signer changed');
    }, [signer]);

    const totalPrice = (+ethers.utils.formatEther(contractData.price.mul(amount)))
        .toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3});

    const buy = useCallback(async () => {
        try {
            if (isBuying) return;
            setSuccess(false);
            setIsBuying(true);
            await buyTickets(amount, signer, contractData, contract)
            setError(undefined);
            setSuccess(true);
        } catch (error: any) {
            setSuccess(false);
            if (error && error.message) {
                setError(error.message);
            }else {
                setError('An unexpected error occurred while buying the tickets, please try again.')
            }
        } finally {
            setIsBuying(false);
        }
    }, [amount, signer, contractData, contract, isBuying]);

    const disableBuyReason = getBuyMessage(contractData, amount, maxTickets);

    return (
        <div className="mint-buy-c w-form">
            <div className="mint-buy" aria-label="Buy Form">
                <h3 className="mint-buy-h3">how many tickets do you want to buy?</h3>
                <div className="mint-buy-amount-w">
                    <h4 className="mint-buy-h4">select amount (1 ticket = 1 NFT)</h4>
                    <select
                        value={amount}
                        onChange={event => setAmount(+event.target.value)}
                        className="mint-amount w-select"
                    >
                        {Array.from(Array(maxTickets).keys()).map((i) => <option key={`ticket-${i + 1}`}
                                                                                 value={i + 1}>{i + 1}</option>)}
                        {maxTickets === 0 && <option value={0}>0</option>}
                    </select>
                </div>
                <div className="mint-buy-info">Phase {phase}: Max. {maxTicketsPerWallet} tickets per wallet or
                    transaction
                </div>

                <h3 className="mint-summary-h3">summary:</h3>
                <div className="mint-buy-summary">
                    <span className="mint-price">{contractData.etherPrice}</span> ETH x
                    <span className="mint-tickets-number">{amount}</span> tickets =&nbsp;
                    <span className="mint-total-price">{totalPrice}</span>
                    <span className="mint-buy-summary-bold">ETH</span>
                </div>
                <button onClick={buy} type="submit" className="mint-button w-button" disabled={!!disableBuyReason || isBuying}>
                    {isBuying ? 'Processing...' : amount > 1 ? 'Buy Tickets' : 'Buy Ticket'}
                </button>
            </div>
            {success && (
                <div className="sale-form-success">
                    Tickets have been bought successfully
                </div>
            )}
            {disableBuyReason && (
                <div className="sale-form-info">
                    {disableBuyReason}
                </div>
            )}
            {error && (
                <div className="sale-form-error">
                    {error}
                </div>
            )}
        </div>
    );
}

export default SaleForm;