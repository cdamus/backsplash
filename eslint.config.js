import js from '@eslint/js';
import globals from 'globals';
import reactDom from 'eslint-plugin-react-dom';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactX from 'eslint-plugin-react-x';
import tseslint from 'typescript-eslint';
import licenseHeader from 'eslint-plugin-license-header';
import jsxa11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked, jsxa11y.flatConfigs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-dom': reactDom,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-x': reactX,
      'license-header': licenseHeader,
    },
    rules: {
      ...reactDom.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      ...reactX.configs['recommended-typescript'].rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'license-header/header': [
        'error',
        [
          '/*****************************************************************************',
          ' * Copyright ' + new Date().getFullYear() + ' Christian W. Damus',
          ' *',
          ' * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files',
          ' * (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge,',
          ' * publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do',
          ' * so, subject to the following conditions:',
          ' *',
          ' * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
          ' *',
          ' * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF',
          ' * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE',
          ' * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN',
          ' * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
          ' *****************************************************************************/',
        ],
      ],
    },
  }
);
