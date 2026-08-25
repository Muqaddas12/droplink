package com.muqaddas123.droplink.localshare

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns

import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DropLinkFilePicker(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext),
    ActivityEventListener {

    companion object {
        private const val PICK_FILES_REQUEST = 1001
    }

    private var pickerPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String {
        return "NativeFilePicker"
    }

    // ---------------------------------------------------------
    // PICK FILES
    // ---------------------------------------------------------

    @ReactMethod
    fun pickFiles(promise: Promise) {

        val activity = reactContext.currentActivity

        if (activity == null) {
            promise.reject(
                "NO_ACTIVITY",
                "Unable to open file picker because no Activity is available."
            )
            return
        }

        if (pickerPromise != null) {
            promise.reject(
                "PICKER_ACTIVE",
                "File picker is already open."
            )
            return
        }

        pickerPromise = promise

        try {

            val intent = Intent(
                Intent.ACTION_OPEN_DOCUMENT
            ).apply {

                /*
                 * Allow all file types.
                 */
                type = "*/*"

                /*
                 * Allow multiple file selection.
                 */
                putExtra(
                    Intent.EXTRA_ALLOW_MULTIPLE,
                    true
                )

                /*
                 * Only show openable documents.
                 */
                addCategory(
                    Intent.CATEGORY_OPENABLE
                )

                /*
                 * Ask Android for persistable read permission
                 * when the selected document provider supports it.
                 */
                addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or
                        Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                )
            }

            activity.startActivityForResult(
                intent,
                PICK_FILES_REQUEST
            )

        } catch (e: Exception) {

            pickerPromise = null

            promise.reject(
                "PICKER_ERROR",
                e.message,
                e
            )
        }
    }

    // ---------------------------------------------------------
    // FILE PICKER RESULT
    // ---------------------------------------------------------

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {

        if (requestCode != PICK_FILES_REQUEST) {
            return
        }

        val promise = pickerPromise

        pickerPromise = null

        if (promise == null) {
            return
        }

        if (
            resultCode != Activity.RESULT_OK ||
            data == null
        ) {

            promise.resolve(
                Arguments.createArray()
            )

            return
        }

        try {

            val files =
                Arguments.createArray()

            val clipData =
                data.clipData

            /*
             * Multiple files.
             */
            if (clipData != null) {

                for (
                    index in 0 until clipData.itemCount
                ) {

                    val uri =
                        clipData
                            .getItemAt(index)
                            .uri

                    takePersistablePermission(uri)

                    files.pushMap(
                        createFileMap(uri)
                    )
                }

            } else {

                /*
                 * Single file.
                 */
                data.data?.let { uri ->

                    takePersistablePermission(uri)

                    files.pushMap(
                        createFileMap(uri)
                    )
                }
            }

            promise.resolve(files)

        } catch (e: Exception) {

            promise.reject(
                "FILE_RESULT_ERROR",
                e.message,
                e
            )
        }
    }

    override fun onNewIntent(
        intent: Intent
    ) {
        // Not required.
    }

    // ---------------------------------------------------------
    // PERSIST URI READ PERMISSION
    // ---------------------------------------------------------

    private fun takePersistablePermission(
        uri: Uri
    ) {

        try {

            reactContext.contentResolver
                .takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )

        } catch (_: SecurityException) {

            /*
             * Some document providers don't support
             * persistable permissions.
             *
             * That's okay. The temporary permission
             * can still be used during the sharing
             * session.
             */

        } catch (_: Exception) {

            // Ignore unsupported providers.
        }
    }

    // ---------------------------------------------------------
    // CREATE FILE INFORMATION
    // ---------------------------------------------------------

    private fun createFileMap(
        uri: Uri
    ) = Arguments.createMap().apply {

        putString(
            "uri",
            uri.toString()
        )

        putString(
            "name",
            getFileName(uri)
        )

        putString(
            "mimeType",
            reactContext.contentResolver
                .getType(uri)
        )

        putDouble(
            "size",
            getFileSize(uri).toDouble()
        )
    }

    // ---------------------------------------------------------
    // GET FILE NAME
    // ---------------------------------------------------------

    private fun getFileName(
        uri: Uri
    ): String {

        var name: String? = null

        val cursor =
            reactContext.contentResolver.query(
                uri,
                arrayOf(
                    OpenableColumns.DISPLAY_NAME
                ),
                null,
                null,
                null
            )

        cursor?.use {

            if (it.moveToFirst()) {

                val index =
                    it.getColumnIndex(
                        OpenableColumns.DISPLAY_NAME
                    )

                if (index >= 0) {

                    name =
                        it.getString(index)
                }
            }
        }

        return name ?: "Unknown File"
    }

    // ---------------------------------------------------------
    // GET FILE SIZE
    // ---------------------------------------------------------

    private fun getFileSize(
        uri: Uri
    ): Long {

        val cursor =
            reactContext.contentResolver.query(
                uri,
                arrayOf(
                    OpenableColumns.SIZE
                ),
                null,
                null,
                null
            )

        cursor?.use {

            if (it.moveToFirst()) {

                val index =
                    it.getColumnIndex(
                        OpenableColumns.SIZE
                    )

                if (
                    index >= 0 &&
                    !it.isNull(index)
                ) {

                    return it.getLong(index)
                }
            }
        }

        return 0L
    }
}