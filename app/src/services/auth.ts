export type AuthCredentials = { email: string; password: string };
const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));
export async function login(credentials: AuthCredentials) {
  await wait(450);
  if (!credentials.email || credentials.password.length < 8) throw new Error('Enter a valid email and at least 8 password characters.');
  // Replace with the backend request once its authentication contract exists.
  return { email: credentials.email };
}
