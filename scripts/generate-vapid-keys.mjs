import { generateKeyPairSync, randomBytes } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1'
});

const publicJwk = publicKey.export({ format: 'jwk' });
const privateJwk = privateKey.export({ format: 'jwk' });

if (!publicJwk.x || !publicJwk.y || !privateJwk.d) {
  throw new Error('VAPID kľúče sa nepodarilo vygenerovať.');
}

const publicBytes = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(publicJwk.x, 'base64url'),
  Buffer.from(publicJwk.y, 'base64url')
]);

console.log('VAPID_PUBLIC_KEY=' + publicBytes.toString('base64url'));
console.log('VAPID_PRIVATE_KEY=' + privateJwk.d);
console.log('CRON_SECRET=' + randomBytes(32).toString('hex'));
console.log('\nVerejný kľúč vložte aj do Vercelu ako VITE_WEB_PUSH_PUBLIC_KEY.');
console.log('Súkromný kľúč patrí iba do Supabase Secrets a nikdy do VITE_ premennej.');
