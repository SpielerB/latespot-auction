export default interface Transaction {
    pending: boolean;
    successful: boolean;
    error: boolean;
    errorMessage?: string;
}