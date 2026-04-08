import { toast as sonnerToast } from "sonner"

export function useToast() {
    return {
        toast: ({ title, description, variant, ...props }) => {
            if (variant === "destructive") {
                sonnerToast.error(title, {
                    description: description,
                    ...props,
                })
            } else {
                sonnerToast.success(title, {
                    description: description,
                    ...props,
                })
            }
        },
        dismiss: (toastId) => sonnerToast.dismiss(toastId),
    }
}
