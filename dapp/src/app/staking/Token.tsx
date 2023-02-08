import './Token.css'
import {useAppDispatch} from '../../store/Store';
import {
    stake,
    unStake,
    useContractModel,
    useTokenMetadata,
    useTokenMetadataSyncPending,
    useTokenTransaction
} from '../../store/contract/ContractReducer';
import ContractToken from '../../model/ContractToken';
import TokenMetadata from '../../model/TokenMetadata';
import deadSquirrel from './deadSquirrel.png'
import {PropsWithChildren, useCallback, useState} from 'react';
import InfoDialog from '../InfoDialog';
import {duration} from 'moment';

interface TokenProps {
    token?: ContractToken;
}

const defaultTokenMetadata: TokenMetadata = {
    name: "Default Squirrel Token",
    description: "This is the default squirrel token used as a placeholder",
    image: deadSquirrel,
    attributes: {
        level: 0
    },
    properties: []
}

const TokenMark = ({children, visible}: PropsWithChildren<{ visible?: boolean }>) => {
    if (!visible) return null;
    return <div className="token-mark">{children}</div>
}

const RealToken = ({token}: { token: ContractToken }) => {
    const dispatch = useAppDispatch();
    const [imageReady, setImageReady] = useState<boolean>(false);
    const [stakeConfirmationOpen, setStakeConfirmationOpen] = useState<boolean>(false);
    const [unStakeConfirmationOpen, setUnStakeConfirmationOpen] = useState<boolean>(false);
    const [upgradeConfirmationOpen, setUpgradeConfirmationOpen] = useState<boolean>(false);
    const contractModel = useContractModel();
    const transaction = useTokenTransaction(token);
    const metadata = useTokenMetadata(token);
    const metadataPending = useTokenMetadataSyncPending(token);
    const stakingDisabled = transaction?.pending || !imageReady || metadataPending || (!token.staked && token.level > 0);

    const toggleStake = useCallback(() => {
        if (token.staked) {
            if (token.level > 0) {
                setUpgradeConfirmationOpen(true);
            } else {
                setUnStakeConfirmationOpen(true);
            }
        } else {
            setStakeConfirmationOpen(true);
        }
    }, [token])

    const onImageLoad = useCallback(() => {
        setImageReady(true)
    }, [setImageReady]);

    let classNames = ["token"];
    if (token.staked) {
        classNames.push("staked");
    } else if (token.level > 0) {
        classNames.push("upgraded")
    }
    switch (token.level) {
        case 1:
            classNames.push("bronze");
            break;
        case 2:
            classNames.push("silver");
            break;
        case 3:
            classNames.push("gold");
            break;
    }

    const renderTokenControl = () => {
        if (!token.staked && token.level > 0) {
            switch (token.level) {
                case 1:
                    return <img
                        className="token-pass"
                        src="https://prod.squirreldegens.com/bronzePass.png"
                        alt="Bronze Pass"
                    />;
                case 2:
                    return <img
                        className="token-pass"
                        src="https://prod.squirreldegens.com/silverPass.png"
                        alt="Silver Pass"
                    />;
                case 3:
                    return <img
                        className="token-pass"
                        src="https://prod.squirreldegens.com/goldPass.png"
                        alt="Gold Pass"
                    />;
            }
        }
        let stakeText = "Stake Token";
        if (transaction?.pending) {
            stakeText = "Pending...";
        } else if (token.staked) {
            if (token.level > 0) {
                stakeText = "Upgrade Token";
            } else {
                stakeText = "Unstake Token";
            }
        }

        const renderStakeTimer = () => {
            if (!token.staked) return <div><br/>&nbsp;<br/></div>;
            const time = token.stakeTime;
            const level = token.level;
            const nextTime = level >= 3 ? 0 : contractModel?.stakingLevels[level] ?? 0;
            const remainingTime = nextTime - time;
            if (level === 3 || remainingTime < 0) return <span>Max level reached<br/><br/></span>;
            const future = duration().add(remainingTime, "seconds");

            const days = future.asDays().toFixed(0);
            const hours = future.hours();
            const minutes = future.minutes();
            const seconds = future.seconds();

            return (
                <div>
                    <div className="mint-buy-h4">
                        Time until you reach next level
                    </div>
                    <div>
                        {days} days {hours} hrs {minutes} mins {seconds} secs
                    </div>
                </div>
            )
        }

        return (
            <div className="token-control-children">
                <div className="stake-timer">
                    {renderStakeTimer()}
                </div>
                <button
                    className="mint-button w-button token-stake-button"
                    onClick={toggleStake}
                    disabled={stakingDisabled}
                >
                    {stakeText}
                </button>
            </div>
        );
    }

    return (
        <div className={classNames.join(" ")}>
            <TokenMark visible={!token.staked && token.level > 0}>Upgraded</TokenMark>
            <TokenMark visible={token.staked}>Staked</TokenMark>
            {metadata && <img
                hidden={!imageReady}
                onLoad={onImageLoad}
                className="token-image"
                src={metadata.image}
                alt={metadata.description}
            />}
            {!imageReady && (
                <div className="token-loading">
                    <div className="token-loader">
                        <span className="token-spinner"/>
                        Token is being loaded
                    </div>
                </div>
            )}
            <div className="token-control">
                {renderTokenControl()}
                <div className="token-error">
                    {transaction?.error && transaction?.errorMessage}
                </div>
            </div>
            <InfoDialog
                iconSrc="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                title="Stake"
                confirmLabel="Stake Token"
                cancelLabel="Cancel"
                open={stakeConfirmationOpen}
                onCancel={() => setStakeConfirmationOpen(false)}
                onConfirm={() => {
                    dispatch(stake(token));
                    setStakeConfirmationOpen(false);
                }}
            >
                <div className="dialog-text">
                    <h3 className="mint-buy-h4">You are about to stake a token</h3>
                    <p>The staking process involves your token being transferred from your wallet to the contract.</p>
                    <p>
                        This will cause the token to disappear from your wallet, it will still be accessible through the
                        staking terminal.
                    </p>
                    <p>Staking will cost a small amount of $ETH for gas fees, usually less than $1 USD.</p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-buy-h4">Staking may take a while</h3>
                    <p>The staking transaction may take a couple of minutes to finish.</p>
                    <p>
                        Please be patient and wait for the token state to update on its own. No page refresh is
                        required.
                    </p>
                </div>
            </InfoDialog>
            <InfoDialog
                iconSrc="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                title="WARNING"
                confirmLabel="Yes, I'm aware that I will lose my progress"
                cancelLabel="No, I want to keep my staking progress"
                open={unStakeConfirmationOpen}
                onCancel={() => setUnStakeConfirmationOpen(false)}
                onConfirm={() => {
                    dispatch(unStake(token));
                    setUnStakeConfirmationOpen(false);
                }}
            >
                <div className="dialog-text">
                    <h3 className="mint-buy-h4">You are about to unstake a token</h3>
                    <p>This will return the token to your wallet and you will be able to trade the token.</p>
                    <p>Unstaking will cost a small amount of $ETH for gas fees, usually less than $1 USD.</p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-buy-h4">Staking progress will be lost</h3>
                    <p>
                        All staking progress up to this point will be lost and you will have to start over when staking
                        the token again.
                    </p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-buy-h4">Unstaking may take a while</h3>
                    <p>The unstaking transaction may take a couple of minutes to finish.</p>
                    <p>
                        Please be patient and wait for the token state to update on its own. No page refresh is
                        required.
                    </p>
                </div>

                <div className="dialog-text">
                    <h3 className="mint-buy-h4">Are you sure you want to unstake your Squirrel?</h3>
                </div>
            </InfoDialog>
            <InfoDialog
                iconSrc="https://assets.website-files.com/621e34ea4b3095856cff1ff8/6226563ba9df1423307642dd_live-icon.svg"
                title="WARNING"
                confirmLabel="Yes, I'm aware that I can't stake this Squirrel anymore after upgrading"
                cancelLabel="No, I want to keep my staking progress"
                open={upgradeConfirmationOpen}
                onCancel={() => setUpgradeConfirmationOpen(false)}
                onConfirm={() => {
                    dispatch(unStake(token));
                    setUpgradeConfirmationOpen(false);
                }}
            >
                <div className="dialog-text">
                    <h3 className="mint-buy-h4">You are about to upgrade a token</h3>
                    <p>This will return the token to your wallet and you will be able to trade the token.</p>
                    <p>Unstaking will cost a small amount of $ETH for gas fees, usually less than $1 USD.</p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-buy-h4">Upgrading will lock token to current level</h3>
                    <p>Once the Squirrel has been upgraded, it may never be staked again.</p>
                    <p>It will remain on the current level forever</p>
                </div>
                <div className="dialog-text">
                    <h3 className="mint-buy-h4">Unstaking may take a while</h3>
                    <p>The unstaking transaction may take a couple of minutes to finish.</p>
                    <p>
                        Please be patient and wait for the token state to update on its own. No page refresh is
                        required.
                    </p>
                </div>
                <h3 className="mint-buy-h4">Are you sure you want to upgrade your Squirrel?</h3>
            </InfoDialog>
        </div>
    )
}

const EmptyToken = () => {
    return (
        <div className="token">
            <div className="token-mark">NO SQUIRREL FOUND :(</div>
            <img className="token-image" src={deadSquirrel} alt="Placeholder squirrel"/>
            <div className="token-control">
                <button className="mint-button w-button token-stake-button" disabled>Stake</button>
            </div>
        </div>
    )
}

const UnrevealedToken = () => {
    return (
        <div className="token">
            <div className="token-mark">Revealing soon...</div>
            <img className="token-image" src={deadSquirrel} alt="Placeholder squirrel"/>
            <div className="token-control">
                <button className="mint-button w-button token-stake-button" disabled>Stake</button>
            </div>
        </div>
    )
}

export const Token = ({token}: TokenProps) => {
    const contractModel = useContractModel();
    if (token) {
        if (contractModel?.tokensRevealed) {
            return <RealToken token={token}/>;
        } else {
            return <UnrevealedToken/>
        }
    } else {
        return <EmptyToken/>;
    }
}