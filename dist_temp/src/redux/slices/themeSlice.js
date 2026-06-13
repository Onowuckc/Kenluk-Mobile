"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleTheme = exports.setTheme = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    mode: 'dark', // Default to premium dark theme
};
const themeSlice = (0, toolkit_1.createSlice)({
    name: 'theme',
    initialState,
    reducers: {
        setTheme: (state, action) => {
            state.mode = action.payload;
        },
        toggleTheme: (state) => {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
        },
    },
});
_a = themeSlice.actions, exports.setTheme = _a.setTheme, exports.toggleTheme = _a.toggleTheme;
exports.default = themeSlice.reducer;
