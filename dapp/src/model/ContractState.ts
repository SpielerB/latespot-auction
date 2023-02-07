import ContractMetadata from './ContractMetadata';
import Contract from './Contract';
import Transaction from './Transaction';
import TokenMetadata from './TokenMetadata';
import ContractToken from './ContractToken';

export default interface ContractState {
    metadata: ContractMetadata;
    contractModel?: Contract;
    rawTokens?: ContractToken[]
    tokenMetadata: {
        [key: number]: TokenMetadata
    };
    pendingTransactions: {
        [key: string]: Transaction | undefined
    };
    rawTokensSyncPending: boolean,
    tokenMetadataSyncPending: {
        [key: number]: boolean
    },
    contractSyncPending: boolean,
}