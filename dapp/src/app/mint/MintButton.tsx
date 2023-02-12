import React from "react";
import {useWeb3Modal} from '@web3modal/react';
import {useAccount} from 'wagmi';
import {useWalletStatus} from '../../hooks/WalletHooks';
import {useMintPending} from '../../store/contract/ContractReducer';

import './MintButton.css';

interface ButtonProps {
    onMint: () => void;
    amount: number;
    mintDisabled?: boolean;
}

const ConnectWalletButton = () => {
    const {isOpen, open} = useWeb3Modal();
    const {isReconnecting, isConnected, isConnecting} = useAccount();

    if (isOpen && (isReconnecting || isConnecting)) {
        return (
            <button className="mint-button w-button" disabled>
                Connecting...
            </button>
        )
    }
    if (!isConnected) {
        return (
            <button className="mint-button w-button" onClick={() => open()}>
                Connect Wallet
            </button>
        );
    }

    return (
        <button className="mint-button w-button" disabled>
            Wallet Connected
        </button>
    );
}

const MintTokenButton = ({amount, onMint, mintDisabled}: ButtonProps) => {
    const mintPending = useMintPending();

    const buttonText = () => {
        if (mintPending) {
            return "Minting..."
        } else {
            return amount > 1 ? `Mint ${amount} Tokens` : "Mint Token"
        }
    }

    return (
        <button
            className="mint-button w-button"
            onClick={onMint}
            type="submit"
            disabled={mintDisabled}
        >
            {buttonText()}
        </button>
    );
}

const MintButton = (props: ButtonProps) => {
    const status = useWalletStatus();

    switch (status) {
        case 'connected':
            return <MintTokenButton {...props} />
        default:
            return <ConnectWalletButton/>
    }
}

export default MintButton;