let registrationNotice = null;
const listeners = new Set();

export function publishRegistrationNotice(shopName) {
  registrationNotice = shopName;
  listeners.forEach((listener) => listener());
}

export function dismissRegistrationNotice() {
  registrationNotice = null;
  listeners.forEach((listener) => listener());
}

export function subscribeRegistrationNotice(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRegistrationNotice() {
  return registrationNotice;
}
