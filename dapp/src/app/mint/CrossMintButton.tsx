import React from "react";
import {CrossmintPayButton} from '@crossmint/client-sdk-react-ui';

import './CrossMintButton.css';
import {useAccount} from '../../hooks/WalletHooks';

interface CrossMintProps {
    etherPrice: string;
    disabled?: boolean;
    hidden?: boolean;
}

const CrossMintButton = ({etherPrice, disabled, hidden}: CrossMintProps) => {

    const {address} = useAccount();

    const clientId = import.meta.env.VITE_CROSSMINT_CLIENT_ID;
    const environment = import.meta.env.VITE_CROSSMINT_ENVIRONMENT;
    if (!clientId || !environment || hidden) return null;

    return (
        <CrossmintPayButton
            className="crossmint-button"
            clientId={clientId}
            mintConfig={{
                type: "erc-721",
                totalPrice: etherPrice
            }}
            environment={environment}
            mintTo={address}
            disabled={disabled}
            theme="dark"
        />
    );
}

export default CrossMintButton;