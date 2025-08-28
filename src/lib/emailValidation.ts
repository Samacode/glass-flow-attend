// Email validation utility
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
  'mail.com',
  'zoho.com',
  'yandex.com'
];

const ADMIN_EMAILS = [
  'admin@attendance.local'
];

export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  // Check if it's an admin email (always allowed)
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    return { isValid: true };
  }

  // Extract domain from email
  const emailParts = email.toLowerCase().split('@');
  if (emailParts.length !== 2) {
    return { isValid: false, message: 'Invalid email format' };
  }

  const domain = emailParts[1];

  // Check if domain is in allowed list
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return { 
      isValid: false, 
      message: `Email domain @${domain} is not allowed. Please use an official email provider like Gmail, Yahoo, Outlook, etc.` 
    };
  }

  return { isValid: true };
};

export const getAllowedDomains = () => ALLOWED_EMAIL_DOMAINS;