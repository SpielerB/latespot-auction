import ContractMetadata from './ContractMetadata';
import Contract from './Contract';

export default interface ContractState {
    metadata: ContractMetadata;
    contractModel?: Contract;
    mintPending: boolean,
    mintError?: string,
    contractSyncPending: boolean,
}