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
import Token from '../../model/Token';


let syncedContract: EthersContract | undefined | null;

type WatchTransaction =
    {
        transaction: Promise<ContractTransaction>,
        type: "buy"
    };

export const updateContractModel = createAction<Contract | undefined>("contract/model/update");
export const watchTokenTransaction = createAsyncThunk<void, WatchTokenTransaction, { state: RootState }>("contract/token/transaction/watch",
    async ({transaction}, thunkAPI) => {
        try {
            const tx = await transaction;
            await tx.wait();
            if (!syncedContract) return; // Contract is gone, maybe user has disconnected the wallet
            // Update contract model after transaction is done
            const updatedContractModel = await internalContractSync(syncedContract, thunkAPI.getState().contract.contractModel);
            thunkAPI.dispatch(updateContractModel(updatedContractModel));
        } catch (error: any) {
            if (typeof error === 'string' && !error.startsWith("Error: user rejected transaction")) {
                console.error(error);
                throw "An unexpected error occurred while waiting for the transaction to be mined."
            }
        }
    });

export const syncContract = createAsyncThunk<Contract | undefined, void, { state: RootState }>("contract/model/sync", async (ignore, thunkAPI) => {
    if (!syncedContract) return undefined;
    return await internalContractSync(syncedContract, thunkAPI.getState().contract.contractModel);
})

export const stake = createAsyncThunk<void, Token, { state: RootState }>("contract/token/stake", async (token, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    if (token.staked) throw "Token has already been staked";
    if (thunkAPI.getState().application.displayState !== DisplayState.STAKING) throw "Staking is not active";

    thunkAPI.dispatch(watchTokenTransaction({
        transaction: syncedContract.stake(token.id),
        token
    }));

});

export const unStake = createAsyncThunk<void, Token, { state: RootState }>("contract/token/unstake", async (token, thunkAPI) => {
    if (!syncedContract) throw "No contract available. Please try again later.";
    const model = thunkAPI.getState().contract.contractModel;
    if (!model) throw "Local contract model is empty. Please try again later.";

    if (!token.staked) throw "Token is not staked";
    if (thunkAPI.getState().application.displayState !== DisplayState.STAKING) throw "Staking is not active";

    thunkAPI.dispatch(watchTokenTransaction({
        transaction: syncedContract.unStake(token.id),
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

export const updateContractMetadata = createAction<ContractMetadata>("contract/metadata/update");

const internalSyncTokens = async (contract: EthersContract, currentModel?: Contract): Promise<Token[]> => {
    const ids: number[] = (await contract.tokens()).map((id: BigNumber) => id.toNumber());
    const existingIds = currentModel?.tokens.map(token => token.id) || [];
    const newIds = ids.filter(id => existingIds.indexOf(id) === -1);
    const result: Token[] = currentModel?.tokens.filter(token => ids.indexOf(token.id) !== -1) || [];
    for (const id of newIds) {
        const tokenUri: string = await contract.tokenURI(id);
        const response = await fetch(tokenUri);
        const metadata = await response.json();
        result.push({
            id,
            ...metadata
        })
    }
    for (let i = 0; i < result.length; ++i) {
        result[i] = {
            ...result[i],
            staked: await contract.staked(result[i].id)
        };
    }
    return result;
}

const internalContractSync = async (contract: EthersContract, currentModel?: Contract): Promise<Contract> => {
export const watchTransaction = createAsyncThunk<void, WatchTransaction, { state: RootState }>("contract/transaction/watch", async ({transaction}, thunkAPI) => {
    const tx = await transaction;
    await tx.wait();
    if (!syncedContract) throw "Contract is not available";
    const updatedModel = await internalContractSync(syncedContract);
    thunkAPI.dispatch(updateContractModel(updatedModel));
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

    // Tokens
    const tokensPromise = internalSyncTokens(contract, currentModel);

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
        tokens: await tokensPromise,
        stakingLevels: (await stakingLevels).map((level: BigNumber) => level.toNumber())
    };
}

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
        const updatedContractModel = await internalContractSync(contract, thunkAPI.getState().contract.contractModel);
        if (syncedContract !== contract) {
            return;
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
        }
        if (syncedContract === contract) {
            setTimeout(syncContractLoop, 10000);
        }

    };
    setTimeout(syncContractLoop, 0);
});

const initialState: ContractState = {
    metadata: {
        started: false
    },
    pendingTransactions: {}
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
        .addCase(watchTransaction.pending, (state, action) => {
            state.pendingTransactions[getKey(action.meta.arg)] = {
                pending: true,
                successful: false,
                error: false,
                errorMessage: undefined
            };
        })
        .addCase(watchTransaction.fulfilled, (state, action) => {
            state.pendingTransactions[getKey(action.meta.arg)] = {
                pending: false,
                successful: true,
                error: false,
                errorMessage: undefined
            };
        })
        .addCase(watchTransaction.rejected, (state, action) => {
            state.pendingTransactions[getKey(action.meta.arg)] = {
                pending: false,
                successful: false,
                error: true,
                errorMessage: action.error.message
            };
        });
});

const getKey = (args: WatchTransaction) => {
    switch (args.type) {
        case 'buy':
            return "buy";
    }
    return "unknown";
}

export const useContractModel = () => createSelectorHook()((state: RootState) => state.contract.contractModel);
export const useContractMetadata = () => createSelectorHook()((state: RootState) => state.contract.metadata);
export const useBuyTransaction = () => createSelectorHook()((state: RootState) => state.contract.pendingTransactions["buy"])
export const useTokenTransaction = (token: Token) => createSelectorHook()((state: RootState) => state.contract.tokenTransactions[token.id])
export default reducer;