"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.setLoading = exports.logout = exports.login = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    user: null,
    token: null,
    loading: false,
};
const authSlice = (0, toolkit_1.createSlice)({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        updateUser: (state, action) => {
            if (state.user) {
                state.user = {
                    ...state.user,
                    ...action.payload,
                };
            }
        },
    },
});
_a = authSlice.actions, exports.login = _a.login, exports.logout = _a.logout, exports.setLoading = _a.setLoading, exports.updateUser = _a.updateUser;
exports.default = authSlice.reducer;
