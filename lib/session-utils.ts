import { SignJWT, jwtVerify } from 'jose';

const key = new TextEncoder().encode(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret-key');

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 week')
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload;
}
