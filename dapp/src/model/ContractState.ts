import ContractMetadata from './ContractMetadata';
import Contract from './Contract';
import Transaction from './Transaction';

export default interface ContractState {
    metadata: ContractMetadata;
    contractModel?: Contract;
    pendingTransactions: {
        [key: string]: Transaction | undefined
    };
}