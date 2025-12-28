
export const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('sk-SK', { 
    style: 'currency', 
    currency: 'EUR',
    maximumFractionDigits: 2 
  }).format(amount || 0);
};

export const formatDate = (dateStr: string) => {
  if(!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('sk-SK');
};

export const formatDateTime = (dateStr: string) => {
  if(!dateStr) return '-';
  return new Date(dateStr).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatDuration = (decimalHours: number) => {
    if (!decimalHours && decimalHours !== 0) return '-';
    const totalMinutes = Math.round(decimalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

export const translateAuthError = (message: string) => {
  if (message.includes("Invalid login credentials")) return "Nesprávny email alebo heslo.";
  if (message.includes("Email not confirmed")) return "Emailová adresa nebola potvrdená.";
  if (message.includes("User already registered")) return "Užívateľ s týmto emailom už existuje.";
  if (message.includes("Password should be at least")) return "Heslo musí mať aspoň 6 znakov.";
  if (message.includes("invalid claim: missing sub claim")) return "Chyba relácie, skúste sa prihlásiť znova.";
  return message; 
};
