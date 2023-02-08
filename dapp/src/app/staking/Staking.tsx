import {useContractModel, useContractTokens, useRawTokensSyncPending} from '../../store/contract/ContractReducer';
import './Staking.css'
import {Token} from './Token';
import React, {useCallback} from 'react';
import {useAddress} from '../../hooks/WalletHooks';

export const Staking = () => {
    const contractTokens = useContractTokens();
    const contractModel = useContractModel();
    const tokensPending = useRawTokensSyncPending();
    const walletAddress = useAddress();
    const showTokensLoading = !contractTokens && tokensPending;

    const renderTokens = useCallback(() => {
        if (!showTokensLoading && contractTokens) {
            let tokens;
            if (contractTokens.length > 0) {
                tokens = contractTokens;
            } else {
                tokens = [...new Array(4)];
            }
            return tokens.map((token, index) => <Token key={`token.${token?.id ?? -index}`} token={token}/>);
        }
        return showTokensLoading && <div>Loading tokens...</div>;
    }, [contractTokens, tokensPending]);

    const renderTokensInfo = useCallback(() => {
        if (contractTokens) {
            if (contractModel?.tokensRevealed) {
                if (contractTokens.length === 0) {
                    return <div>There are no Squirrels in your wallet. Go and get one to start staking.</div>
                }
            } else {
                return (
                    <>
                        <div>The Squirrel degens NFTs have not been revealed.</div>
                        <div>Once the reveal is over, your NFTs will be stakeable via the staking terminal.</div>
                    </>
                )
            }
        } else {
            return <div>Loading tokens...</div>;
        }
    }, [contractTokens, tokensPending, contractModel]);

    return (
        <div className="staking">
            <h2 className="staking-title">STAKING TERMINAL</h2>
            <div className="mint-wallet">
                <div className="mint-wallet-p"><h3 className="mint-h3">CONNECTED WALLET: </h3>{walletAddress}</div>
            </div>
            <h2 className="staking-title">MY SQUIRRELS</h2>
            <div>
                <h3 className="staking-tokens-info">
                    {renderTokensInfo()}
                </h3>
            </div>
            <div className="staking-tokens">
                {renderTokens()}
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
                        Have a look at the detailed utilities of each level under the "Holder Benefits" section on our webpage.
                    </span>
                    </li>
                    <li>
                        <h3 className="mint-buy-h4">A Squirrel may only be upgraded once!</h3>
                        <div>
                            As soon as the first level (Bronze) has been reached, the NFT will automatically be upgraded
                            if it gets unstaked.
                        </div>
                        <div>Once upgraded, the level and its utilities will be fixed</div>
                        <div>
                            If the first level (Bronze) isn't reached, the NFT can be unstaked without upgrading and may be
                            staked again at any time.
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
                            network congestion and your selected gas price.
                        </div>
                        <div>
                            All information about ongoing transactions, such as staking or unstaking, is lost upon
                            reloading the page.
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