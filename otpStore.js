// otpStore.js
// Kiwi Sports Apparel — One-Time Passcode (OTP) key–value service

function createOtpStore() {
  const MAX_MS = 5 * 60 * 1000; // 5 minutes
  const store = new Map();

  const purgeExpired = () => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.expiresAt <= now || v.used) store.delete(k);
    }
  };

  const issue = (passcode, durationMs) => {
    purgeExpired();
    const capped = Math.min(Number(durationMs) || 0, MAX_MS);
    const now = Date.now();
    const existedAndUnexpired = store.has(passcode);
    store.set(passcode, { expiresAt: now + capped, used: false });
    return existedAndUnexpired;
  };

  const useOnce = (passcode) => {
    purgeExpired();
    const entry = store.get(passcode);
    if (!entry) return false;
    const now = Date.now();
    if (entry.expiresAt <= now || entry.used) {
      store.delete(passcode);
      return false;
    }
    entry.used = true;
    store.set(passcode, entry);
    purgeExpired();
    return true;
  };

  return { issue, useOnce };
}

// --- self-test when run directly ---
if (typeof require !== 'undefined' && require.main === module) {
  console.log('🔐 Kiwi Sports Apparel OTP Store Test\n');
  console.log('═'.repeat(50));
  
  const otp = createOtpStore();

  // Test 1: Issue new OTP
  console.log('📝 Test 1: Issuing new OTP (123456) for 10 minutes...');
  const issuedNew = otp.issue(123456, 10 * 60 * 1000);
  console.log(`   Result: ${issuedNew ? '✅ Reissued existing' : '🆕 New key created'}`);
  console.log('   Expected: 🆕 New key created (false)\n');

  // Test 2: Re-issue same OTP
  console.log('🔄 Test 2: Re-issuing same OTP (123456) for 30 seconds...');
  const reissued = otp.issue(123456, 30_000);
  console.log(`   Result: ${reissued ? '✅ Reissued existing' : '🆕 New key created'}`);
  console.log('   Expected: ✅ Reissued existing (true)\n');

  // Test 3: Use OTP for the first time
  console.log('🔑 Test 3: Using OTP for login...');
  const firstUse = otp.useOnce(123456);
  console.log(`   Result: ${firstUse ? '✅ Login accepted' : '❌ Login rejected'}`);
  console.log('   Expected: ✅ Login accepted (true)\n');

  // Test 4: Try to use same OTP again
  console.log('🚫 Test 4: Trying to use same OTP again...');
  const secondUse = otp.useOnce(123456);
  console.log(`   Result: ${secondUse ? '✅ Login accepted' : '❌ Login rejected'}`);
  console.log('   Expected: ❌ Login rejected (false)\n');

  // Summary
  console.log('═'.repeat(50));
  console.log('📊 Test Summary:');
  console.log(`   New key issue: ${issuedNew === false ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Key re-issue: ${reissued === true ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   First use: ${firstUse === true ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Second use: ${secondUse === false ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = (issuedNew === false && reissued === true && firstUse === true && secondUse === false);
  console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED!'}`);
}
