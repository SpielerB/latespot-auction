import {createAction, createAsyncThunk, createReducer} from '@reduxjs/toolkit';
import {createSelectorHook} from 'react-redux';
import {RootState} from '../Store';
import Contract from '../../model/Contract';
import {BigNumber, Contract as EthersContract, ContractTransaction} from 'ethers'
import {deepEqual} from 'wagmi';
import DisplayState from '../../model/DisplayState';
import {setContractState} from '../application/ApplicationReducer';
import ContractState from '../../model/ContractState';
import ContractMetadata from '../../model/ContractMetadata';
import TokenMetadata from '../../model/TokenMetadata';
import ContractToken from '../../model/ContractToken';

let syncedContract: EthersContract | undefined | null;

type WatchTransaction =
    {
        transaction: Promise<ContractTransaction>,
        type: "buy"
    } | {
    transaction: Promise<ContractTransaction>,
    type: "stake" | "unstake",
    token: ContractToken
}

const getTransactionKey = (args: WatchTransaction) => {
    switch (args.type) {
        case 'stake':
        case 'unstake':
            return `token.${args.token.id}`;
        case 'buy':
            return "buy";
    }
    return "unknown";
}

export const updateContractModel = createAction<Contract | undefined>("contract/model/update");

export const watchTransaction = createAsyncThunk<void, WatchTransaction, { state: RootState }>("contract/transaction/watch", async ({transaction}, thunkAPI) => {
    try {
        const tx = await transaction;
        await tx.wait();
        if (!syncedContract) throw "Contract is not available";
        thunkAPI.dispatch(syncContract());
    } catch (error: any) {
        if (error.code !== "ACTION_REJECTED") {
            throw error;
        }
    }
});

export const syncContract = createAsyncThunk<Contract | undefined, void, { state: RootState }>("contract/model/sync", async (ignore, thunkAPI) => {
    if (!syncedContract) return undefined;
    if (!thunkAPI.getState().contract.rawTokensSyncPending) {
        thunkAPI.dispatch(syncRawTokens());
    }
    const contract = syncedContract;
    const updatedContractModel = await internalContractSync(contract);
    if (syncedContract !== contract) {
        return undefined;
    }
    const existingContractModel = thunkAPI.getState().contract.contractModel;
    if (!deepEqual(updatedContractModel, existingContractModel)) {
        thunkAPI.dispatch(updateContractModel(updatedContractModel));
        const currentApplicationState = thunkAPI.getState().application.displayState;
        let applicationState = DisplayState.PRE_AUCTION;
        if (updatedContractModel.privateAuction.hasStarted) {
            applicationState = DisplayState.PRIVATE_AUCTION;
        }
        if (updatedContractModel.privateAuction.hasStarted && !updatedContractModel.privateAuction.isActive) {
            applicationState = DisplayState.PRE_PUBLIC_AUCTION;
        }
        if (updatedContractModel.privateAuction.hasStarted && updatedContractModel.publicAuction.hasStarted) {
            applicationState = DisplayState.PUBLIC_AUCTION;
        }
        if (updatedContractModel.publicAuction.hasStarted && !updatedContractModel.publicAuction.isActive) {
            applicationState = DisplayState.PRE_MINT;
        }
        if (updatedContractModel.tokensMinted) {
            applicationState = DisplayState.PRE_REVEAL;
        }
        if (updatedContractModel.tokensRevealed) {
            applicationState = DisplayState.STAKING;
        }
        if (applicationState !== currentApplicationState) {
            thunkAPI.dispatch(setContractState(applicationState));
        }
        return updatedContractModel;
    }
    return existingContractModel;
})

export const stake = createAsyncThunk<void, ContractToken, { state: RootState }>("contract/token/stake", async (token, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    if (token.staked) throw "Token has already been staked";
    if (token.level === 3) throw "Token is already at max level"
    if (thunkAPI.getState().application.displayState !== DisplayState.STAKING) throw "Staking is not active";

    thunkAPI.dispatch(watchTransaction({
        transaction: syncedContract.stake(token.id),
        type: "stake",
        token
    }));

});

export const unStake = createAsyncThunk<void, ContractToken, { state: RootState }>("contract/token/unstake", async (token, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    if (!token.staked) throw "Token is not staked";
    if (thunkAPI.getState().application.displayState !== DisplayState.STAKING) throw "Staking is not active";

    thunkAPI.dispatch(watchTransaction({
        transaction: syncedContract.unStake(token.id),
        type: "unstake",
        token
    }));

});

export const buyTickets = createAsyncThunk<void, number, { state: RootState }>("contract/function/buy", async (ticketCount, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    if (ticketCount <= 0) throw "You must buy at least one ticket";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    const isPrivateAuctionActive = model.privateAuction.isActive;
    const isPublicAuctionActive = model.publicAuction.isActive;

    if (!isPublicAuctionActive && !isPrivateAuctionActive) throw "No active auction.";
    if (isPrivateAuctionActive && !model.whitelisted) throw "Current wallet not whitelisted";

    const price = BigNumber.from(isPrivateAuctionActive ? model.privateAuction.price : model.publicAuction.price);
    const value = price.mul(ticketCount);
    const address = await syncedContract.signer.getAddress();

    const response = await fetch(`${import.meta.env.VITE_API_URL}/sign`, {
        method: "POST",
        body: JSON.stringify({address, value}),
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) throw `HTTP ${response.status}: ${response.statusText}`;

    const signature = await response.text()
    let transactionPromise;
    if (isPrivateAuctionActive) {
        transactionPromise = syncedContract.buyPrivateAuction(signature, {value});
    } else {
        transactionPromise = syncedContract.buyPublicAuction(signature, {value});
    }
    thunkAPI.dispatch(watchTransaction({transaction: transactionPromise, type: "buy"}))
})

export const updateContractSyncLoop = createAsyncThunk<void, EthersContract | undefined | null, { state: RootState }>("contract/sync/update", (contract, thunkAPI) => {
    const contractRemoved = syncedContract && !contract
    syncedContract = contract;
    if (!contract) {
        if (contractRemoved) {
            thunkAPI.dispatch(updateContractModel(undefined));
        }
        return;
    }
    const syncContractLoop = async () => {
        if (syncedContract !== contract) {
            return;
        }
        try {
            thunkAPI.dispatch(syncContract());
        } catch (e) {
            console.error("Error while fetching contract model", e)
        }
        if (syncedContract === contract) {
            setTimeout(syncContractLoop, 10000);
        }

    };
    setTimeout(syncContractLoop, 0);
});

export const updateContractMetadata = createAction<ContractMetadata>("contract/metadata/update");

const syncRawTokens = createAsyncThunk<ContractToken[], void, { state: RootState }>("contract/tokens/sync", async (ignore, thunkAPI) => {
    if (!syncedContract) throw "No contract connected";
    const ids: number[] = (await syncedContract.tokens()).map((id: BigNumber) => id.toNumber());
    const loadedTokens = thunkAPI.getState().contract.rawTokens;
    const result: ContractToken[] = [];
    for (const id of ids) {
        const token: ContractToken = {
            id: id,
            level: (await syncedContract.stakeLevel(id)).toNumber(),
            stakeTime: (await syncedContract.stakeTime(id)).toNumber(),
            staked: await syncedContract.staked(id),
            tokenURI: await syncedContract.tokenURI(id),
        };
        const existingToken = loadedTokens?.find(token => token.id === id);
        const pendingSync = thunkAPI.getState().contract.tokenMetadataSyncPending[id];
        if (!pendingSync && (!existingToken || existingToken.tokenURI !== token.tokenURI)) {
            thunkAPI.dispatch(syncTokenMetadata(token));
        }
        result.push(token);
    }
    return result;
});

const syncTokenMetadata = createAsyncThunk<TokenMetadata, ContractToken, { state: RootState }>("contract/tokens/metadata/sync", async (rawToken, thunkAPI) => {
    if (!syncedContract) throw "No contract connected";
    const response = await fetch(rawToken.tokenURI);
    const metadata = await response.json();
    metadata.image = `https://ipfs.squirreldegens.com/ipfs/${metadata.image.replaceAll("ipfs://", "")}`
    return metadata;
});

const internalContractSync = async (contract: EthersContract): Promise<Contract> => {

    // General
    const mintedPromise = contract.minted();
    const revealedPromise = contract.revealed();
    const ticketsPromise = contract.tickets();
    const whitelistedPromise = contract.whitelisted();
    const stakingLevels = contract.stakeLevels();

    // Private Auction
    const privateStartedPromise = contract.privateAuctionStarted();
    const privateActivePromise = contract.privateAuctionActive();
    const privateStoppedPromise = contract.privateAuctionStopped();
    const privateTicketsPromise = contract.privateAuctionTickets();
    const privateTicketsPerWalletPromise = contract.privateAuctionTicketsPerWallet();
    const privatePricePromise = contract.privateAuctionPrice();
    const privateTicketCountPromise = contract.privateAuctionTicketCount();
    const privateTicketSupplyPromise = contract.privateAuctionTicketSupply();

    // Public Auction
    const publicStartedPromise = contract.publicAuctionStarted();
    const publicActivePromise = contract.publicAuctionActive();
    const publicStoppedPromise = contract.publicAuctionStopped();
    const publicTicketsPromise = contract.publicAuctionTickets();
    const publicTicketsPerWalletPromise = contract.publicAuctionTicketsPerWallet();
    const publicPricePromise = contract.publicAuctionPrice();
    const publicTicketCountPromise = contract.publicAuctionTicketCount();
    const publicTicketSupplyPromise = contract.publicAuctionTicketSupply();

    return {
        privateAuction: {
            hasStarted: await privateStartedPromise,
            isActive: await privateActivePromise,
            hasStopped: await privateStoppedPromise,
            walletTickets: (await privateTicketsPromise).toNumber(),
            ticketsSold: (await privateTicketCountPromise).toNumber(),
            ticketSupply: (await privateTicketSupplyPromise).toNumber(),
            ticketLimit: (await privateTicketsPerWalletPromise).toNumber(),
            price: (await privatePricePromise).toString()
        },
        publicAuction: {
            hasStarted: await publicStartedPromise,
            isActive: await publicActivePromise,
            hasStopped: await publicStoppedPromise,
            walletTickets: (await publicTicketsPromise).toNumber(),
            ticketsSold: (await publicTicketCountPromise).toNumber(),
            ticketSupply: (await publicTicketSupplyPromise).toNumber(),
            ticketLimit: (await publicTicketsPerWalletPromise).toNumber(),
            price: (await publicPricePromise).toString()
        },
        tokensMinted: await mintedPromise,
        tokensRevealed: await revealedPromise,
        walletTickets: (await ticketsPromise).toNumber(),
        whitelisted: await whitelistedPromise,
        stakingLevels: (await stakingLevels).map((level: BigNumber) => level.toNumber())
    };
}

const initialState: ContractState = {
    metadata: {
        started: false
    },
    tokenMetadata: {},
    pendingTransactions: {},
    contractSyncPending: false,
    rawTokensSyncPending: false,
    tokenMetadataSyncPending: {}
};

const reducer = createReducer(initialState, builder => {
    builder
        .addCase(updateContractModel, (state, action) => {
            state.contractModel = action.payload;
        })
        .addCase(syncContract.fulfilled, (state, action) => {
            state.contractModel = action.payload;
        })
        .addCase(syncContract.rejected, (state) => {
            state.contractModel = undefined;
        })
        .addCase(updateContractMetadata, (state, action) => {
            state.metadata = action.payload;
        })
        .addCase(syncRawTokens.pending, (state, action) => {
            state.rawTokensSyncPending = true;
        })
        .addCase(syncRawTokens.fulfilled, (state, action) => {
            state.rawTokens = action.payload;
            state.rawTokensSyncPending = false;
        })
        .addCase(syncRawTokens.rejected, (state, action) => {
            state.rawTokensSyncPending = false;
            // TODO: Error handling
        })
        .addCase(stake.rejected, (state, action) => {
            state.pendingTransactions[`token.${action.meta.arg.id}`] = {
                pending: false,
                successful: false,
                error: true,
                errorMessage: action.error.message || "Unknown error occurred while staking token"
            };
        })
        .addCase(unStake.rejected, (state, action) => {
            state.pendingTransactions[`token.${action.meta.arg.id}`] = {
                pending: false,
                successful: false,
                error: true,
                errorMessage: action.error.message || "Unknown error occurred while unstaking token"
            };
        })
        .addCase(syncTokenMetadata.pending, (state, action) => {
            state.tokenMetadataSyncPending[action.meta.arg.id] = true;
        })
        .addCase(syncTokenMetadata.fulfilled, (state, action) => {
            state.tokenMetadata[action.meta.arg.id] = action.payload;
            state.tokenMetadataSyncPending[action.meta.arg.id] = false;
        })
        .addCase(syncTokenMetadata.rejected, (state, action) => {
            state.tokenMetadataSyncPending[action.meta.arg.id] = false;
            // TODO: Error handling
        })
        .addCase(watchTransaction.pending, (state, action) => {
            state.pendingTransactions[getTransactionKey(action.meta.arg)] = {
                pending: true,
                successful: false,
                error: false
            };
        })
        .addCase(watchTransaction.fulfilled, (state, action) => {
            state.pendingTransactions[getTransactionKey(action.meta.arg)] = {
                pending: false,
                successful: true,
                error: false
            };
        })
        .addCase(watchTransaction.rejected, (state, action) => {
            state.pendingTransactions[getTransactionKey(action.meta.arg)] = {
                pending: false,
                successful: false,
                error: true,
                errorMessage: action.error.message || "Unexpected error occurred during transaction"
            };
        });
});

export const useContractModel = () => createSelectorHook()((state: RootState) => state.contract.contractModel);
export const useContractTokens = () => createSelectorHook()((state: RootState) => state.contract.rawTokens);
export const useTokenMetadata = (idOrToken: number | ContractToken) => createSelectorHook()((state: RootState) => {
    let id;
    if (typeof idOrToken === "number") {
        id = idOrToken;
    } else {
        id = idOrToken.id;
    }
    return state.contract.tokenMetadata[id]
});

export const useRawTokensSyncPending = () => createSelectorHook()((state: RootState) => state.contract.rawTokensSyncPending);
export const useTokenMetadataSyncPending = (token: ContractToken) => createSelectorHook()((state: RootState) => state.contract.tokenMetadataSyncPending[token.id]);
export const useContractSyncPending = () => createSelectorHook()((state: RootState) => state.contract.contractSyncPending);
export const useContractMetadata = () => createSelectorHook()((state: RootState) => state.contract.metadata);
export const useBuyTransaction = () => createSelectorHook()((state: RootState) => state.contract.pendingTransactions["buy"])
export const useTokenTransaction = (token: ContractToken) => createSelectorHook()((state: RootState) => state.contract.pendingTransactions[`token.${token.id}`])
export default reducer;