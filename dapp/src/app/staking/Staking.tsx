import {useContractModel} from '../../store/contract/ContractReducer';
import './Staking.css'
import {Token} from './Token';
import React from 'react';
import {useAddress} from '../../hooks/WalletHooks';

export const Staking = () => {
    const contractModel = useContractModel();
    const walletAddress = useAddress();

    return (
        <div className={"staking"}>
            <h2 className="staking-title">STAKING TERMINAL</h2>
            <div className="mint-wallet">
                <div className="mint-wallet-p"><h3 className="mint-h3">CONNECTED WALLET: </h3>{walletAddress}</div>
            </div>
            <h2 className="staking-title">MY SQUIRRELS</h2>
            <div className="staking-tokens">
                {contractModel?.tokens.map(token => <Token key={`token.${token.id}`} token={token}/>)}
                {contractModel?.tokens.map(token => <Token key={`token.${token.id}`} token={token}/>)}
                {contractModel?.tokens.map(token => <Token key={`token.${token.id}`} token={token}/>)}
                {contractModel?.tokens.map(token => <Token key={`token.${token.id}`} token={token}/>)}
                {contractModel?.tokens.map(token => <Token key={`token.${token.id}`} token={token}/>)}
                {contractModel?.tokens.map(token => <Token key={`token.${token.id}`} token={token}/>)}
            </div>
            <div className="staking-info">
                <h2 className="staking-title">IMPORTANT STAKING INFORMATION</h2>
                <ul>
                    <li>
                        <h3 className="mint-buy-h4">There are 3 staking levels:</h3>
                        <ol>
                            <li>Bronze Pass (30 days)</li>
                            <li>Silver Pass (60 days)</li>
                            <li>Gold Pass (180 days)</li>
                        </ol>
                        <span>
                        Have a look at the detailed utilities of each level under the "Holder benefits" section on our webpage.
                    </span>
                    </li>
                    <li>
                        <h3 className="mint-buy-h4">A squirrel may only be upgraded once!</h3>
                        <div>Once upgraded, the level and it's utilities will be fixed</div>
                        <div>
                            If the first level (Bronze) isn't reached the NFT can unstaked without upgrading and may be
                            staked again at any time
                        </div>
                        <div>
                            As soon as the first level (Bronze) has been reached, the NFT will automatically be upgraded
                            if
                            it gets unstaked.
                        </div>
                    </li>
                    <li>
                        <h3 className="mint-buy-h4">Contract data</h3>
                        <div>
                            You do not have to reload the page to get the current contract data, such as your tokens.
                        </div>
                        <div>
                            The page requests an update of the contract data in intervals of 10 seconds.
                        </div>
                    </li>
                    <li>
                        <h3 className="mint-buy-h4">Staking and unstaking may take a while</h3>
                        <div>
                            The process of staking or unstaking the NFT may take a while, depending on the current
                            network
                            congestion and your selected gas price.
                        </div>
                        <div>
                            All information about ongoing transactions such as staking or unstaking are lost upon
                            reloading
                            the page.
                        </div>
                        <div>
                            Therefore, if you initiated a transaction to stake or unstake a token, please wait up to 5
                            minutes before submitting another transaction on the same token after reloading the page.
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    );
}