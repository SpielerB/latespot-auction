import Token from '../../model/Token';
import './Token.css'
import {useAppDispatch} from '../../store/Store';
import {stake, unStake, useTokenTransaction} from '../../store/contract/ContractReducer';

interface TokenProps {
    token: Token;
}

export const Token = ({token}: TokenProps) => {
    const dispatch = useAppDispatch();
    const transaction = useTokenTransaction(token);

    return (
        <div className="token">
            <img src={token.image} alt={token.description}/>
            <div className="token-control">
                <button
                    className="mint-button w-button token-stake-button"
                    onClick={() => dispatch(token.staked ? unStake(token) : stake(token))}
                    disabled={transaction?.pending}
                >
                    {transaction?.pending ? "Pending..." : token.staked ? "Unstake" : "Stake"}
                </button>
                <div className="token-error">
                    {transaction?.errorMessage}
                </div>
            </div>
        </div>
    )
}