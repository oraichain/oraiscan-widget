/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
        './index.html',
        './src/**/*.{vue,js,ts,jsx,tsx}',
        './lib/**/*.{vue,js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [require('daisyui')],
    daisyui: {
        themes: [
            {
                light: {
                    ...require('daisyui/src/theming/themes')[
                        '[data-theme=light]'
                    ],
                    primary: '#7332E7',
                },
            },
            {
                dark: {
                    ...require('daisyui/src/theming/themes')[
                        '[data-theme=dark]'
                    ],
                    primary: '#7332E7',
                    'base-100': '#141416',
                    'base-200': '#18181A',
                    'base-300': '#383B40',
                },
            },
        ],
    },
};
