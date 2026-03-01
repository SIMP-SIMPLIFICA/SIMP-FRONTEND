/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			colors: {
				// Cores primárias (azul)
				primary: {
					50: "#e6f0ff",
					100: "#b3d1ff",
					200: "#80b3ff",
					300: "#4d94ff",
					400: "#1a75ff",
					500: "#0066cc", // base
					600: "#0052a3",
					700: "#003d7a",
					800: "#002952",
					900: "#001429",
				},
				// Tons de cinza (neutros) - sem preto puro
				gray: {
					50: "#f9f9f9",
					100: "#f2f2f2",
					200: "#e6e6e6",
					300: "#cccccc",
					400: "#b3b3b3",
					500: "#999999",
					600: "#808080",
					700: "#666666",
					800: "#4d4d4d",
					900: "#333333", // substituto do preto
				},
				// Cores de status
				success: {
					50: "#e8f8f5",
					100: "#d1f2e8",
					500: "#2ecc71", // base
					700: "#1e8b4c",
				},
				danger: {
					50: "#fdeded",
					100: "#f9d6d6",
					500: "#e74c3c", // base
					700: "#b03a2e",
				},
				warning: {
					50: "#fef9e7",
					100: "#fcf3cf",
					500: "#f1c40f", // base
					700: "#b08f0b",
				},
				// Branco e preto (preto = gray.900)
				white: "#ffffff",
				black: "#333333", // ou gray.900

				// Manter variáveis Shadow DOM para não quebrar 100% o radix-ui das modais do Shadcn e Toasts
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"], // Defina uma fonte padrão
				mono: ["Roboto Mono", "monospace"],
			},
			fontSize: {
				xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
				sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
				base: ["1rem", { lineHeight: "1.5rem" }], // 16px
				lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
				xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
				"2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
				"3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
				"4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
				"5xl": ["3rem", { lineHeight: "1" }], // 48px
				"6xl": ["3.75rem", { lineHeight: "1" }], // 60px
				"7xl": ["4.5rem", { lineHeight: "1" }], // 72px
			},
			spacing: {
				// Espaçamentos baseados em múltiplos de 8px
				'7.5': '1.875rem', // 30px,
				'8': '2rem',    // 32px
				'12': '3rem',   // 48px
				'16': '4rem',   // 64px
			},
			borderRadius: {
				DEFAULT: '0.375rem', // 6px padrão
				'lg': '0.5rem',      // 8px
				'xl': '0.75rem',     // 12px
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			boxShadow: {
				card: '0 2px 8px rgba(0, 0, 0, 0.1)',
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
		require("tailwindcss-animate")
	],
}
