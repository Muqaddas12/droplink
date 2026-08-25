package com.muqaddas123.droplink.openfile

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class OpenFileModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "OpenFile"
    }

    // =========================================================
    // GET FILE URI
    // =========================================================

    @ReactMethod
    fun getFileUri(
        filePath: String,
        promise: Promise
    ) {
        try {

            val file =
                File(filePath)

            if (!file.exists()) {

                promise.reject(
                    "FILE_NOT_FOUND",
                    "File does not exist: $filePath"
                )

                return
            }

            val context =
                reactApplicationContext

            val uri =
                FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    file
                )

            promise.resolve(
                uri.toString()
            )

        } catch (e: Exception) {

            promise.reject(
                "GET_FILE_URI_ERROR",
                e.message,
                e
            )
        }
    }
    // =========================================================
    // GET MIME TYPE
    // =========================================================

    @ReactMethod
    fun getMimeType(
        filePath: String,
        promise: Promise
    ) {
        try {

            val extension =
                File(filePath)
                    .extension
                    .lowercase()

            val mimeType =
                MimeTypeMap
                    .getSingleton()
                    .getMimeTypeFromExtension(
                        extension
                    )
                    ?: "*/*"

            promise.resolve(
                mimeType
            )

        } catch (e: Exception) {

            promise.reject(
                "GET_MIME_TYPE_ERROR",
                e.message,
                e
            )
        }
    }
    // =========================================================
    // OPEN FILE
    // =========================================================

    @ReactMethod
    fun openFile(
        filePathOrUri: String,
        requestedMimeType: String?,
        promise: Promise
    ) {
        try {

            // -------------------------------------------------
            // ORIGINAL FILE PATH
            // -------------------------------------------------

            val sourceUri =
                Uri.parse(filePathOrUri)

            val isContentUri =
                sourceUri.scheme == "content"

            val file =
                File(filePathOrUri)

            if (!isContentUri && !file.exists()) {

                promise.reject(
                    "FILE_NOT_FOUND",
                    "File does not exist: $filePathOrUri"
                )

                return
            }

            if (!isContentUri && !file.isFile) {

                promise.reject(
                    "INVALID_FILE",
                    "Path is not a file: $filePathOrUri"
                )

                return
            }

            val context =
                reactApplicationContext

            // -------------------------------------------------
            // MIME TYPE
            // -------------------------------------------------

            val extension =
                file.extension
                    .lowercase()

            val mimeType =
                requestedMimeType
                    ?: MimeTypeMap
                    .getSingleton()
                    .getMimeTypeFromExtension(
                        extension
                    )
                    ?: "*/*"

            // -------------------------------------------------
            // FILE PROVIDER URI
            // -------------------------------------------------

            val uri =
                if (isContentUri) {
                    sourceUri
                } else {
                    FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        file
                    )
                }

            android.util.Log.d(
                "OpenFile",
                "OPEN FILE PATH: ${file.absolutePath}"
            )

            android.util.Log.d(
                "OpenFile",
                "OPEN FILE URI: $uri"
            )

            android.util.Log.d(
                "OpenFile",
                "OPEN FILE MIME: $mimeType"
            )

            // -------------------------------------------------
            // VIEW INTENT
            // -------------------------------------------------

            val intent =
                Intent(
                    Intent.ACTION_VIEW
                ).apply {

                    setDataAndType(
                        uri,
                        mimeType
                    )

                    addFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )

                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK
                    )

                    /*
                     * Required by some Android versions/apps
                     * for passing temporary URI permission.
                     */
                    clipData =
                        ClipData.newRawUri(
                            file.name,
                            uri
                        )
                }

            // -------------------------------------------------
            // FIND COMPATIBLE APPLICATIONS
            // -------------------------------------------------

            val packageManager =
                context.packageManager

            val activities =
                packageManager.queryIntentActivities(
                    intent,
                    0
                )

            if (activities.isEmpty()) {

                promise.reject(
                    "NO_APP_FOUND",
                    "No application is installed that can open ${file.name}"
                )

                return
            }

            // -------------------------------------------------
            // GRANT READ PERMISSION
            // -------------------------------------------------

            activities.forEach { resolveInfo ->

                val packageName =
                    resolveInfo
                        .activityInfo
                        .packageName

                context.grantUriPermission(
                    packageName,
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }

            // -------------------------------------------------
            // OPEN DEFAULT APP / CHOOSER
            // -------------------------------------------------

            val chooser =
                Intent.createChooser(
                    intent,
                    "Open with"
                ).apply {

                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK
                    )

                    addFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )

                    clipData =
                        ClipData.newRawUri(
                            file.name,
                            uri
                        )
                }

            context.startActivity(
                chooser
            )

            promise.resolve(
                true
            )

        } catch (e: Exception) {

            android.util.Log.e(
                "OpenFile",
                "OPEN FILE ERROR",
                e
            )

            promise.reject(
                "OPEN_FILE_ERROR",
                e.message,
                e
            )
        }
    }
}