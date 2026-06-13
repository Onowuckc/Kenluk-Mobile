"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistor = exports.store = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const redux_persist_1 = require("redux-persist");
const async_storage_1 = require("@react-native-async-storage/async-storage");
const authSlice_1 = require("./slices/authSlice");
const walletSlice_1 = require("./slices/walletSlice");
const fidelityPaymentSlice_1 = require("./slices/fidelityPaymentSlice");
const themeSlice_1 = require("./slices/themeSlice");
const persistConfig = {
    key: 'root',
    storage: async_storage_1.default,
    whitelist: ['auth', 'theme'], // Persist auth state and theme preference
};
const rootReducer = (0, toolkit_1.combineReducers)({
    auth: authSlice_1.default,
    wallet: walletSlice_1.default,
    fidelityPayment: fidelityPaymentSlice_1.default,
    theme: themeSlice_1.default,
});
const persistedReducer = (0, redux_persist_1.persistReducer)(persistConfig, rootReducer);
exports.store = (0, toolkit_1.configureStore)({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false, // Necessary flag configuration when using redux-persist
    }),
});
exports.persistor = (0, redux_persist_1.persistStore)(exports.store);
