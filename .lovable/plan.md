# Plan: Fix direct UPI receipt sharing

## Confirmed diagnosis

- Sharing a saved receipt image from Gallery works, so Budget Bro can receive, cache, and scan a normal image.
- Direct sharing from multiple UPI apps fails before AI scanning because those apps are not supplying a standard readable image file through the web share target.
- The exact alternate payload can vary by UPI app, so the fix must support both file and text-style shares rather than adding another filename/MIME workaround.

## What will change

1. **Accept every useful share form**
   - Extend the installed-app share declaration to accept receipt files plus shared title, text, and URL fields.
   - Keep JPEG/JPG, PNG, WebP, and PDF support.

2. **Replace the single-file handoff with a share envelope**
   - Update the service worker to inspect all multipart fields once and preserve either:
     - a readable image/PDF, or
     - payment text such as merchant, amount, date, transaction details, or a shared URL.
   - Store the payload temporarily in the device cache and remove it immediately after Budget Bro consumes it.
   - Do not store receipt data remotely.

3. **Add a text-receipt scan path**
   - Extend the existing secure `scan-bill` function to accept either an image/PDF or shared payment text.
   - Use the same structured result: title, amount, date, suggested category, notes, currency, and confidence.
   - Keep AI scanning online-only and require the user to review before saving.

4. **Improve recovery when Android supplies an unreadable private reference**
   - Detect empty or inaccessible shares separately from malformed images.
   - Open a small recovery prompt that lets the user choose the saved screenshot immediately, instead of only showing an error toast.
   - Explain that the payment app did not provide readable receipt data without blaming the scanner.

5. **Prevent stale-share and duplicate-processing errors**
   - Give each incoming share a unique temporary key instead of one fixed cache entry.
   - Pass that key to Expenses, consume it once, and then clean the URL and cache.
   - Preserve the existing Pro and Bill Scan setting checks.

## Validation

- Test standard and filename-less JPEG/JPG shares, PNG, WebP, and PDF.
- Test text-only and mixed text-plus-file UPI-style shares.
- Test an inaccessible/empty Android share and confirm the screenshot picker appears.
- Confirm Gallery sharing and the Scan Bill button still work.
- Verify the pre-filled expense is never saved until the user confirms it.
- Publish the update; because the Android share declaration changes, reinstall the installed app once after publishing for the final device test.

## Platform boundary

If a UPI app sends only a private Android content reference and no readable file or payment text, an installed web app cannot access that private reference. In that case Budget Bro will offer the one-tap screenshot picker; fully transparent handling of such private references requires the native Android version.
