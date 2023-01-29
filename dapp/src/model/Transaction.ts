type Transaction = { pending: boolean; successful: boolean; error: false; } | {
    pending: false;
    successful: false;
    error: true;
    errorMessage: string;
}

export default Transaction;