package app.lovable.p83abe351206248f9a1cefeca04124c9c;

import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageDecoder;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import androidx.annotation.Nullable;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "ReceiptShare")
public class ReceiptSharePlugin extends Plugin {
    private static final String PREFS_NAME = "budget_bro_receipt_shares";
    private static final String PENDING_KEY = "pending";
    private final ExecutorService copyExecutor = Executors.newSingleThreadExecutor();

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (intent == null || (!Intent.ACTION_SEND.equals(intent.getAction())
                && !Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction()))) {
            return;
        }

        List<Uri> sharedUris = collectUris(intent);
        if (sharedUris.isEmpty()) return;

        final String shareId = UUID.randomUUID().toString();
        final List<Uri> uris = sharedUris;
        copyExecutor.execute(() -> copyAndQueueShare(shareId, uris));
    }

    @PluginMethod
    public void getPendingShares(PluginCall call) {
        JSArray shares = new JSArray();
        JSONArray pending = readPending();
        for (int index = 0; index < pending.length(); index++) {
            JSONObject record = pending.optJSONObject(index);
            if (record != null) {
                JSObject share = new JSObject();
                share.put("id", record.optString("id"));
                shares.put(share);
            }
        }
        JSObject result = new JSObject();
        result.put("shares", shares);
        call.resolve(result);
    }

    @PluginMethod
    public void consumeSharedImages(PluginCall call) {
        String id = call.getString("id", "");
        JSONObject record = findPending(id);
        if (record == null) {
            call.reject("This shared receipt is no longer available.");
            return;
        }

        JSArray files = new JSArray();
        JSONArray storedFiles = record.optJSONArray("files");
        if (storedFiles != null) {
            for (int index = 0; index < storedFiles.length(); index++) {
                JSONObject storedFile = storedFiles.optJSONObject(index);
                if (storedFile == null) continue;
                File file = new File(storedFile.optString("path", ""));
                if (!file.isFile()) continue;
                JSObject sharedFile = new JSObject();
                sharedFile.put("path", file.getAbsolutePath());
                sharedFile.put("name", storedFile.optString("name", "receipt.jpg"));
                sharedFile.put("type", storedFile.optString("type", "image/jpeg"));
                files.put(sharedFile);
            }
        }

        JSObject result = new JSObject();
        result.put("files", files);
        call.resolve(result);
    }

    @PluginMethod
    public void acknowledgeSharedImages(PluginCall call) {
        String id = call.getString("id", "");
        JSONArray pending = readPending();
        JSONArray remaining = new JSONArray();
        for (int index = 0; index < pending.length(); index++) {
            JSONObject record = pending.optJSONObject(index);
            if (record == null) continue;
            if (id.equals(record.optString("id"))) {
                deleteRecordFiles(record);
            } else {
                remaining.put(record);
            }
        }
        writePending(remaining);
        call.resolve();
    }

    private List<Uri> collectUris(Intent intent) {
        List<Uri> uris = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        ClipData clipData = intent.getClipData();
        if (clipData != null) {
            for (int index = 0; index < clipData.getItemCount(); index++) {
                addUri(uris, seen, clipData.getItemAt(index).getUri());
            }
        }

        Uri dataUri = intent.getData();
        addUri(uris, seen, dataUri);
        try {
            Object stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (stream instanceof Uri) addUri(uris, seen, (Uri) stream);
        } catch (RuntimeException ignored) {
            // Some payment apps attach malformed or inaccessible stream extras.
        }
        try {
            ArrayList<Uri> streams = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (streams != null) {
                for (Uri uri : streams) addUri(uris, seen, uri);
            }
        } catch (RuntimeException ignored) {
            // ClipData and the single-stream path remain available on older Android versions.
        }
        return uris;
    }

    private void addUri(List<Uri> uris, Set<String> seen, @Nullable Uri uri) {
        if (uri == null) return;
        String value = uri.toString();
        if (("content".equals(uri.getScheme()) || "file".equals(uri.getScheme())) && seen.add(value)) {
            uris.add(uri);
        }
    }

    private void copyAndQueueShare(String id, List<Uri> uris) {
        File directory = new File(getContext().getCacheDir(), "shared-receipts");
        if (!directory.exists() && !directory.mkdirs()) return;

        JSONArray copiedFiles = new JSONArray();
        for (Uri uri : uris) {
            try {
                String type = getReceiptMimeType(uri);
                if (type == null) continue;
                String originalName = getDisplayName(uri);
                String name = safeFileName(originalName, type);
                File destination = new File(directory, id + "_" + name);
                try (InputStream input = getContext().getContentResolver().openInputStream(uri);
                     OutputStream output = new FileOutputStream(destination)) {
                    if (input == null) continue;
                    byte[] buffer = new byte[16 * 1024];
                    int read;
                    while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
                }
                if (!destination.isFile() || destination.length() == 0) {
                    destination.delete();
                    continue;
                }

                if (type.startsWith("image/") && !isBrowserScannableImage(type)) {
                    File converted = convertImageToJpeg(destination);
                    if (converted != null) {
                        destination.delete();
                        destination = converted;
                        type = "image/jpeg";
                        name = stripExtension(name) + ".jpg";
                    }
                }

                JSONObject file = new JSONObject();
                file.put("path", destination.getAbsolutePath());
                file.put("name", name);
                file.put("type", type);
                copiedFiles.put(file);
            } catch (Exception ignored) {
                // Continue collecting valid files if one URI is unreadable.
            }
        }

        if (copiedFiles.length() == 0) return;
        JSONObject record = new JSONObject();
        try {
            record.put("id", id);
            record.put("files", copiedFiles);
            JSONArray pending = readPending();
            pending.put(record);
            while (pending.length() > 10) {
                JSONObject oldest = pending.optJSONObject(0);
                if (oldest != null) deleteRecordFiles(oldest);
                pending = removeFirst(pending);
            }
            writePending(pending);
            JSObject event = new JSObject();
            event.put("id", id);
            notifyListeners("shareReceived", event, true);
        } catch (JSONException ignored) {
            deleteRecordFiles(record);
        }
    }

    @Nullable
    private String getReceiptMimeType(Uri uri) {
        String mime = getContext().getContentResolver().getType(uri);
        if (mime != null) mime = mime.split(";")[0].trim().toLowerCase();
        if (mime != null && (mime.startsWith("image/") || "application/pdf".equals(mime))) return mime;

        String name = getDisplayName(uri).toLowerCase();
        if (name.endsWith(".pdf")) return "application/pdf";
        String extension = MimeTypeMap.getFileExtensionFromUrl(name);
        String guessed = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        return guessed != null && guessed.startsWith("image/") ? guessed : null;
    }

    private String getDisplayName(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return cursor.getString(index);
            }
        } catch (Exception ignored) {
            // Use a generic receipt filename for providers without display-name metadata.
        }
        return "receipt";
    }

    private String safeFileName(String input, String mimeType) {
        String fallbackExtension = "application/pdf".equals(mimeType) ? ".pdf" : ".jpg";
        String name = input == null ? "" : input.replaceAll("[^A-Za-z0-9._-]", "_");
        if (name.isEmpty()) name = "receipt" + fallbackExtension;
        if (!name.contains(".")) name += fallbackExtension;
        return name.length() > 140 ? name.substring(name.length() - 140) : name;
    }

    private boolean isBrowserScannableImage(String mimeType) {
        return "image/jpeg".equals(mimeType) || "image/png".equals(mimeType) || "image/webp".equals(mimeType);
    }

    private File convertImageToJpeg(File source) {
        Bitmap bitmap = null;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ImageDecoder.Source imageSource = ImageDecoder.createSource(source);
                bitmap = ImageDecoder.decodeBitmap(imageSource, (decoder, info, src) -> {
                    int largest = Math.max(info.getSize().getWidth(), info.getSize().getHeight());
                    if (largest > 2048) {
                        float scale = 2048f / largest;
                        decoder.setTargetSize(Math.max(1, Math.round(info.getSize().getWidth() * scale)),
                                Math.max(1, Math.round(info.getSize().getHeight() * scale)));
                    }
                });
            } else {
                BitmapFactory.Options bounds = new BitmapFactory.Options();
                bounds.inJustDecodeBounds = true;
                BitmapFactory.decodeFile(source.getAbsolutePath(), bounds);
                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inSampleSize = Math.max(1, (int) Math.ceil(Math.max(bounds.outWidth, bounds.outHeight) / 2048.0));
                bitmap = BitmapFactory.decodeFile(source.getAbsolutePath(), options);
            }
            if (bitmap == null) return null;
            File jpeg = new File(source.getParentFile(), source.getName() + ".jpg");
            try (FileOutputStream output = new FileOutputStream(jpeg)) {
                if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 88, output)) {
                    jpeg.delete();
                    return null;
                }
            }
            return jpeg;
        } catch (Exception ignored) {
            return null;
        } finally {
            if (bitmap != null) bitmap.recycle();
        }
    }

    private String stripExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    private JSONArray readPending() {
        String json = preferences().getString(PENDING_KEY, "[]");
        try {
            return new JSONArray(json);
        } catch (JSONException ignored) {
            return new JSONArray();
        }
    }

    @Nullable
    private JSONObject findPending(String id) {
        JSONArray pending = readPending();
        for (int index = 0; index < pending.length(); index++) {
            JSONObject record = pending.optJSONObject(index);
            if (record != null && id.equals(record.optString("id"))) return record;
        }
        return null;
    }

    private void writePending(JSONArray pending) {
        preferences().edit().putString(PENDING_KEY, pending.toString()).commit();
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private JSONArray removeFirst(JSONArray source) {
        JSONArray result = new JSONArray();
        for (int index = 1; index < source.length(); index++) result.put(source.opt(index));
        return result;
    }

    private void deleteRecordFiles(JSONObject record) {
        JSONArray files = record.optJSONArray("files");
        if (files == null) return;
        for (int index = 0; index < files.length(); index++) {
            JSONObject file = files.optJSONObject(index);
            if (file != null) new File(file.optString("path", "")).delete();
        }
    }
}