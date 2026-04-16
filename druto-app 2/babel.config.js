module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            // React 19 Compiler — automatic memoization of all components/hooks
            // Eliminates need for manual useMemo, useCallback, React.memo
            ["babel-plugin-react-compiler", {}],
        ],
    };
};
