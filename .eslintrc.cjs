/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    env: {
        es6: true,
        node: true,
    },

    // Base config
    extends: ["eslint:recommended"],

    overrides: [
        // Typescript
        {
            files: ["**/*.ts"],
            plugins: ["@typescript-eslint"],
            parser: "@typescript-eslint/parser",
            extends: ["plugin:@typescript-eslint/recommended"],
            rules: {
                "@typescript-eslint/no-unused-vars": [
                    "error",
                    {
                        argsIgnorePattern: "^_",
                        varsIgnorePattern: "^_",
                    },
                ],
            },
        },
    ],
};
