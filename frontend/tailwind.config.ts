import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
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
        // IBM Blue palette
        ibm: {
          50: "#edf5ff",
          100: "#d0e2ff",
          200: "#a6c8ff",
          300: "#78a9ff",
          400: "#4589ff",
          500: "#0f62fe",
          600: "#0043ce",
          700: "#002d9c",
          800: "#001d6c",
          900: "#001141",
        },
        // IBM Cyan palette
        cyan: {
          50: "#e5f6ff",
          100: "#bae6ff",
          200: "#82cfff",
          300: "#33b1ff",
          400: "#1192e8",
          500: "#0072c3",
          600: "#00539a",
          700: "#003a6d",
          800: "#012749",
          900: "#061727",
        },
        // IBM Purple palette
        purple: {
          50: "#f6f2ff",
          100: "#e8daff",
          200: "#d4bbff",
          300: "#be95ff",
          400: "#a56eff",
          500: "#8a3ffc",
          600: "#6929c4",
          700: "#491d8b",
          800: "#31135e",
          900: "#1c0f30",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        float: "float 3s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      backgroundImage: {
        "gradient-ibm": "linear-gradient(135deg, #0f62fe 0%, #8a3ffc 100%)",
        "gradient-warm": "linear-gradient(135deg, #ff7eb6 0%, #ff832b 100%)",
        "gradient-cool": "linear-gradient(135deg, #33b1ff 0%, #0072c3 100%)",
        "gradient-hero":
          "radial-gradient(ellipse at 60% 40%, rgba(15,98,254,0.15) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(138,63,252,0.1) 0%, transparent 50%)",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "hsl(var(--foreground))",
            a: { color: "hsl(var(--primary))" },
            strong: { color: "hsl(var(--foreground))" },
            code: {
              color: "hsl(var(--foreground))",
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "0.25rem",
              padding: "0.1rem 0.3rem",
            },
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
