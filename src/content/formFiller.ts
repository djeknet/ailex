import { PersonalInfo } from '@shared/types/extension';

// Fill form fields with personal information
export async function fillForm(personalInfo: PersonalInfo) {
  if (!personalInfo) {
    throw new Error('No personal information available');
  }

  const fields = findFormFields();
  let filledCount = 0;

  for (const field of fields) {
    const filled = await fillField(field, personalInfo);
    if (filled) filledCount++;
  }

  return {
    total: fields.length,
    filled: filledCount
  };
}

// Find all form fields on the page
function findFormFields(): HTMLInputElement[] {
  const inputs = Array.from(document.querySelectorAll('input, textarea, select')) as HTMLInputElement[];
  
  return inputs.filter(input => {
    // Skip hidden, submit, button fields
    const type = input.type?.toLowerCase();
    if (type === 'hidden' || type === 'submit' || type === 'button') {
      return false;
    }
    
    // Skip disabled or readonly fields
    if (input.disabled || input.readOnly) {
      return false;
    }
    
    return true;
  });
}

// Fill a single field based on personal info
async function fillField(field: HTMLInputElement, info: PersonalInfo): Promise<boolean> {
  const fieldType = identifyFieldType(field);
  
  if (!fieldType) return false;

  let value: string | undefined;

  switch (fieldType) {
    case 'firstName':
      value = info.firstName;
      break;
    case 'lastName':
      value = info.lastName;
      break;
    case 'email':
      value = info.email;
      break;
    case 'phone':
      value = info.phone;
      break;
    case 'country':
      value = info.country;
      break;
    case 'city':
      value = info.city;
      break;
    case 'address':
      value = info.address;
      break;
    case 'zipCode':
      value = info.zipCode;
      break;
    case 'position':
      value = info.position;
      break;
    case 'about':
      value = info.about;
      break;
  }

  if (value) {
    setFieldValue(field, value);
    return true;
  }

  return false;
}

// Identify field type by name, id, placeholder, etc.
function identifyFieldType(field: HTMLInputElement): string | null {
  const name = field.name?.toLowerCase() || '';
  const id = field.id?.toLowerCase() || '';
  const placeholder = field.placeholder?.toLowerCase() || '';
  const label = getFieldLabel(field)?.toLowerCase() || '';
  const type = field.type?.toLowerCase() || '';

  const combined = `${name} ${id} ${placeholder} ${label}`;

  // First name
  if (combined.match(/first.?name|fname|given.?name/i)) {
    return 'firstName';
  }

  // Last name
  if (combined.match(/last.?name|lname|surname|family.?name/i)) {
    return 'lastName';
  }

  // Email
  if (type === 'email' || combined.match(/email|e-mail/i)) {
    return 'email';
  }

  // Phone
  if (type === 'tel' || combined.match(/phone|tel|mobile|cell/i)) {
    return 'phone';
  }

  // Country
  if (combined.match(/country/i)) {
    return 'country';
  }

  // City
  if (combined.match(/city|town/i)) {
    return 'city';
  }

  // Address
  if (combined.match(/address|street/i)) {
    return 'address';
  }

  // Zip code
  if (combined.match(/zip|postal.?code|postcode/i)) {
    return 'zipCode';
  }

  // Position
  if (combined.match(/position|job.?title|occupation/i)) {
    return 'position';
  }

  // About
  if (combined.match(/about|bio|description/i)) {
    return 'about';
  }

  return null;
}

// Get label text for a field
function getFieldLabel(field: HTMLInputElement): string | null {
  // Try to find label by "for" attribute
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent;
  }

  // Try to find parent label
  const parentLabel = field.closest('label');
  if (parentLabel) return parentLabel.textContent;

  return null;
}

// Set field value and trigger events
function setFieldValue(field: HTMLInputElement, value: string) {
  field.value = value;

  // Trigger events to ensure the value is registered
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true }));
}

