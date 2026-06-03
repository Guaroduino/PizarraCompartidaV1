/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./App.tsx",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary': 'var(--color-primary)',
                'primary-dark': 'var(--color-primary-dark)',
                'secondary': 'var(--color-secondary)',
                'light-bg': '#e5e7eb',
                'dark-bg': '#111111',
                'dark-card': '#1e1e1e',
                'dark-text': '#d1d5db'
            }
        }
    },
    plugins: [],
}
