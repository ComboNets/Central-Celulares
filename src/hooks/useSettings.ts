import { useQuery } from "@tanstack/react-query";

// Configure the WhatsApp number via VITE_WHATSAPP_NUMBER in a .env file.
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";

export function useWhatsAppNumber() {
  return useQuery({
    queryKey: ["whatsapp_number"],
    queryFn: async () => WHATSAPP_NUMBER,
  });
}

export function generateWhatsAppLink(phoneNumber: string, phoneModel: string) {
  const cleanNumber = phoneNumber.replace(/\D/g, "");
  const message = encodeURIComponent(`Hi, I'm interested in the ${phoneModel}. Is it available?`);
  return `https://wa.me/${cleanNumber}?text=${message}`;
}
