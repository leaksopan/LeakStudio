import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * CurrencyInput — Input field yang menampilkan format IDR saat blur,
 * dan kembali ke angka biasa saat fokus agar mudah diedit.
 *
 * Props:
 *   value       {number|string} — nilai numerik (dikontrol dari luar)
 *   onValueChange {function}    — dipanggil dengan nilai numerik (number)
 *   placeholder {string}
 *   className   {string}
 *   id, disabled, dll — diteruskan ke <input>
 *
 * Contoh:
 *   <CurrencyInput value={formData.price} onValueChange={v => handleChange('price', v)} />
 */
const CurrencyInput = React.forwardRef(
    ({ className, value, onValueChange, placeholder = "0", ...props }, ref) => {
        const [isFocused, setIsFocused] = React.useState(false);
        const [rawValue, setRawValue] = React.useState('');

        // Sync rawValue saat value dari luar berubah (misal saat form di-reset)
        React.useEffect(() => {
            if (!isFocused) {
                setRawValue(value !== undefined && value !== null && value !== '' ? String(value) : '');
            }
        }, [value, isFocused]);

        const formatIDR = (num) => {
            if (num === '' || num === null || num === undefined || isNaN(Number(num))) return '';
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(Number(num));
        };

        const handleFocus = () => {
            setIsFocused(true);
            // Saat fokus, tampilkan angka mentah tanpa format
            setRawValue(value !== undefined && value !== '' ? String(value) : '');
        };

        const handleBlur = () => {
            setIsFocused(false);
            // Parse angka dari input, buang karakter non-numerik kecuali titik/koma
            const cleaned = rawValue.replace(/[^0-9.,]/g, '').replace(',', '.');
            const parsed = parseFloat(cleaned);
            const finalValue = isNaN(parsed) ? 0 : parsed;
            onValueChange?.(finalValue);
            setRawValue(String(finalValue));
        };

        const handleChange = (e) => {
            // Saat fokus, hanya izinkan angka, titik, koma
            const val = e.target.value.replace(/[^0-9.,]/g, '');
            setRawValue(val);
        };

        return (
            <input
                ref={ref}
                type="text"
                inputMode="decimal"
                value={isFocused ? rawValue : formatIDR(value)}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            />
        );
    }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
