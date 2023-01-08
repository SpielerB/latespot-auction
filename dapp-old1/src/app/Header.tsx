import React from 'react';
import ContractData from './model/ContractData';
import {hasAuctionEnded} from '../helper/ContractHelper';

interface HeaderProps {
    contractData: ContractData;
}

const phaseTitle = (phase: number) => {
    switch (phase) {
        case 0:
            return 'Phase has ended';
        case 1:
            return 'Public Dutch Auction';
        case 2:
            return 'Private Auction';
        case 3:
            return 'Public Auction';
        default:
            return 'Error';
    }
}

const Header = ({contractData}: HeaderProps) => {
    const phase = contractData.currentPhase;

    const phaseCount = contractData.currentPhaseData.ticketCount;
    const phaseSupply = contractData.currentPhaseData.ticketSupply;
    const phaseLeft = phaseSupply - phaseCount;

    const totalSupply = contractData.totalSupply;
    const totalCount = contractData.totalCount;
    const totalLeft = totalSupply - totalCount;

    const title = phaseTitle(contractData.currentPhase);

    if (hasAuctionEnded(contractData)) {
        return (
            <div className="mint-header no-width">
                <h1 className="mint-h1">The Auction has ended</h1>
                <h3 className="mint-h3">Thanks to all the participants</h3>
            </div>
        );
    }

    if (phase === 0) {
        return (
            <div className="mint-header no-width">
                <h1 className="mint-h1">Phase has ended</h1>
                <h3 className="mint-h3">Wait for the next phase to start</h3>
            </div>
        );
    }

    return (
        <div className="mint-header">
            <h4 className="mint-h4">phase {phase}</h4>
            <h1 className="mint-h1">{title}</h1>
            <h3 className="mint-h3"><span className="mint-tickets-left">{phaseLeft}</span> / {phaseSupply} tickets left
                in phase</h3>
            <h3 className="mint-h3"><span className="mint-tickets-left">{totalLeft}</span> / {totalSupply} tickets left
                in total</h3>
            <div className="mint-live">
                <img
                    src="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                    loading="lazy"
                    alt=""
                    className="mint-live-icon"
                />
                <div className="mint-live-p">
                    Live Price Per Ticket: <span className="mint-live-price">{contractData.etherPrice}</span> ETH
                </div>
            </div>
        </div>
    );
}

export default Header;