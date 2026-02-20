/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
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
