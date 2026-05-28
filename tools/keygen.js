const crypto = require('crypto');

/**
 * OSIPIX License Key Generator
 *
 * Usage:
 *   node keygen.js <REQUEST_CODE> <TYPE>
 *   node keygen.js <PRODUCT> <REQUEST_CODE> <TYPE>
 *
 * PRODUCT: SADOK | PRORAHUNOK
 * TYPE:
 *   SADOK: DEMO | MONTHLY | QUARTERLY | HALFYEAR | ANNUAL | LIFETIME
 *   PRORAHUNOK: MONTHLY | HALFYEAR | ANNUAL | LIFETIME
 */

const PRODUCTS = {
  SADOK: {
    title: 'SADOK',
    secret: 'SADOK-LICENSE-SECRET-V1',
    types: ['DEMO', 'MONTHLY', 'QUARTERLY', 'HALFYEAR', 'ANNUAL', 'LIFETIME'],
  },
  PRORAHUNOK: {
    title: 'ProRahunok',
    secret: 'PRORAHUNOK-LICENSE-SECRET-V1',
    types: ['MONTHLY', 'HALFYEAR', 'ANNUAL', 'LIFETIME'],
  },
};

const formatKey = (hash) => [
  hash.slice(0, 4),
  hash.slice(4, 8),
  hash.slice(8, 12),
  hash.slice(12, 16),
].join('-');

const generateKey = (productCode, requestCode, type) => {
  const product = PRODUCTS[productCode];

  if (!product || !requestCode || !product.types.includes(type)) {
    console.log('Usage: node keygen.js [SADOK|PRORAHUNOK] <REQUEST_CODE> <TYPE>');
    console.log('SADOK types: DEMO, MONTHLY, QUARTERLY, HALFYEAR, ANNUAL, LIFETIME');
    console.log('PRORAHUNOK types: MONTHLY, HALFYEAR, ANNUAL, LIFETIME');
    process.exit(1);
  }

  const hash = crypto
    .createHash('sha256')
    .update(requestCode + type + product.secret)
    .digest('hex')
    .toUpperCase();

  return formatKey(hash);
};

const args = process.argv.slice(2);
const hasProductArg = args[0] && PRODUCTS[args[0].toUpperCase()];
const productCode = hasProductArg ? args[0].toUpperCase() : 'SADOK';
const code = hasProductArg ? args[1] : args[0];
const type = (hasProductArg ? args[2] : args[1])?.toUpperCase();
const key = generateKey(productCode, String(code || '').trim().toUpperCase(), type);

console.log('\n======================================');
console.log('   OSIPIX LICENSE KEY GENERATOR');
console.log('======================================');
console.log(`Product: ${PRODUCTS[productCode].title}`);
console.log(`Request Code: ${code}`);
console.log(`License Type: ${type}`);
console.log('--------------------------------------');
console.log(`ACTIVATION KEY: ${key}`);
console.log('======================================\n');
