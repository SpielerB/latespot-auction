import ContractMetadata from './ContractMetadata';
import Contract from './Contract';

export default interface ContractState {
    metadata: ContractMetadata;
    contractModel?: Contract;
    pendingTransaction?: boolean;
    transactionError?: string;
}