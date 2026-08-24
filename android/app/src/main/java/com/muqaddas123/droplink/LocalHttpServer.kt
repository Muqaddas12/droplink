package com.muqaddas123.droplink

import android.content.ContentResolver
import android.os.Environment
import android.webkit.MimeTypeMap
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.util.concurrent.Executors

data class SharedFile(
    val uri: android.net.Uri,
    val name: String,
    val mimeType: String?,
    val size: Long
)

class LocalHttpServer(
    private val contentResolver: ContentResolver
) {

    private var serverSocket: ServerSocket? = null

    private val executor =
        Executors.newCachedThreadPool()

    @Volatile
    private var running = false

    @Volatile
    private var sharedFiles: List<SharedFile> = emptyList()

    var port: Int = 0
        private set

    fun setFiles(files: List<SharedFile>) {
        sharedFiles = files
    }

    // ---------------------------------------------------------
    // START SERVER
    // ---------------------------------------------------------

    fun start(): Int {

        if (running) {
            return port
        }

        serverSocket = ServerSocket(0)

        port = serverSocket!!.localPort

        running = true

        executor.execute {

            while (running) {

                try {

                    val socket =
                        serverSocket!!.accept()

                    /*
                     * Every browser connection gets
                     * its own worker.
                     *
                     * Therefore download and upload
                     * can happen simultaneously.
                     */
                    executor.execute {
                        handleClient(socket)
                    }

                } catch (e: Exception) {

                    if (running) {
                        e.printStackTrace()
                    }
                }
            }
        }

        return port
    }

    // ---------------------------------------------------------
    // STOP SERVER
    // ---------------------------------------------------------

    fun stop() {

        running = false

        try {
            serverSocket?.close()
        } catch (_: Exception) {
        }

        serverSocket = null

        sharedFiles = emptyList()
    }

    // ---------------------------------------------------------
    // CLIENT HANDLER
    // ---------------------------------------------------------

    private fun handleClient(
        socket: Socket
    ) {

        try {

            socket.use {

                val input =
                    BufferedInputStream(
                        socket.getInputStream()
                    )

                val output =
                    BufferedOutputStream(
                        socket.getOutputStream()
                    )

                /*
                 * Read HTTP headers only.
                 *
                 * IMPORTANT:
                 * Do NOT read the request body here.
                 * POST upload body must be streamed directly
                 * into the destination file.
                 */
                val request =
                    readRequestHeaders(input)
                        ?: return

                val requestLine =
                    request
                        .substringBefore("\r\n")

                val parts =
                    requestLine.split(" ")

                if (parts.size < 2) {
                    return
                }

                val method =
                    parts[0].uppercase()

                val rawPath =
                    parts[1]

                val decodedPath =
                    try {
                        URLDecoder.decode(
                            rawPath,
                            "UTF-8"
                        )
                    } catch (_: Exception) {
                        rawPath
                    }

                android.util.Log.d(
                    "DropLink",
                    "HTTP $method $decodedPath"
                )

                when {

                    method == "GET" &&
                        (
                            decodedPath == "/" ||
                                decodedPath.isEmpty()
                            ) -> {

                        sendIndexPage(
                            output
                        )
                    }

                    method == "GET" &&
                        decodedPath.startsWith(
                            "/download/"
                        ) -> {

                        sendFile(
                            output,
                            decodedPath
                        )
                    }

                    method == "POST" &&
                        decodedPath == "/upload" -> {

                        handleUpload(
                            input,
                            output,
                            request
                        )
                    }

                    else -> {

                        sendText(
                            output,
                            "404 Not Found",
                            "Not Found"
                        )
                    }
                }
            }

        } catch (e: Exception) {

            if (running) {

                android.util.Log.e(
                    "DropLink",
                    "CLIENT ERROR",
                    e
                )
            }
        }
    }

    // ---------------------------------------------------------
    // READ HTTP HEADERS
    // ---------------------------------------------------------

    private fun readRequestHeaders(
        input: BufferedInputStream
    ): String? {

        val builder =
            StringBuilder()

        var previous = -1

        while (true) {

            val current =
                input.read()

            if (current == -1) {
                return null
            }

            builder.append(
                current.toChar()
            )

            if (
                previous == '\r'.code &&
                current == '\n'.code
            ) {

                if (
                    builder
                        .toString()
                        .endsWith(
                            "\r\n\r\n"
                        )
                ) {
                    break
                }
            }

            previous = current

            /*
             * Prevent malicious/invalid
             * gigantic HTTP headers.
             */
            if (
                builder.length >
                32 * 1024
            ) {
                return null
            }
        }

        return builder.toString()
    }

    // ---------------------------------------------------------
    // PARSE HTTP HEADER
    // ---------------------------------------------------------

    private fun getHeader(
        request: String,
        name: String
    ): String? {

        val target =
            name.lowercase()

        return request
            .split("\r\n")
            .drop(1)
            .firstOrNull {

                it.substringBefore(
                    ":"
                ).trim().lowercase() == target
            }
            ?.substringAfter(
                ":",
                ""
            )
            ?.trim()
    }

    // ---------------------------------------------------------
    // BROWSER PAGE
    // ---------------------------------------------------------

    private fun sendIndexPage(
        output: BufferedOutputStream
    ) {

        val files =
            sharedFiles

        val html =
            buildString {

                append(
                    """
                    <!DOCTYPE html>
                    <html>
                    <head>

                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1"
                    >

                    <meta
                        charset="UTF-8"
                    >

                    <title>DropLink</title>

                    <style>

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        padding: 20px;
                        font-family:
                            Arial,
                            sans-serif;
                        background:
                            #f5f7fb;
                        color:
                            #111827;
                    }

                    .container {
                        max-width:
                            700px;
                        margin:
                            auto;
                    }

                    .header {
                        background:
                            #2563eb;
                        color:
                            white;
                        padding:
                            28px;
                        border-radius:
                            22px;
                        margin-bottom:
                            20px;
                    }

                    .header h1 {
                        margin:
                            0;
                        font-size:
                            28px;
                    }

                    .header p {
                        margin-top:
                            8px;
                        opacity:
                            .9;
                    }

                    .card {
                        background:
                            white;
                        border-radius:
                            18px;
                        padding:
                            20px;
                        margin-bottom:
                            16px;
                        box-shadow:
                            0 2px 10px
                            rgba(0,0,0,.05);
                    }

                    .card-title {
                        font-size:
                            19px;
                        font-weight:
                            800;
                        margin-bottom:
                            14px;
                    }

                    .file {
                        background:
                            #f8fafc;
                        border-radius:
                            14px;
                        padding:
                            15px;
                        margin-bottom:
                            10px;
                    }

                    .file-name {
                        font-weight:
                            bold;
                        word-break:
                            break-word;
                    }

                    .file-size {
                        color:
                            #6b7280;
                        margin-top:
                            5px;
                        margin-bottom:
                            10px;
                    }

                    .download {
                        display:
                            inline-block;
                        padding:
                            10px 16px;
                        border-radius:
                            10px;
                        background:
                            #2563eb;
                        color:
                            white;
                        text-decoration:
                            none;
                        font-weight:
                            600;
                    }

                    input[type=file] {
                        width:
                            100%;
                        padding:
                            12px;
                        border:
                            1px solid
                            #d1d5db;
                        border-radius:
                            12px;
                        background:
                            white;
                    }

                    .upload-button {
                        width:
                            100%;
                        margin-top:
                            12px;
                        padding:
                            13px;
                        border:
                            none;
                        border-radius:
                            12px;
                        background:
                            #10b981;
                        color:
                            white;
                        font-size:
                            15px;
                        font-weight:
                            800;
                        cursor:
                            pointer;
                    }

                    .upload-button:disabled {
                        opacity:
                            .6;
                    }

                    .status {
                        margin-top:
                            14px;
                        padding:
                            12px;
                        border-radius:
                            10px;
                        background:
                            #f3f4f6;
                        font-size:
                            13px;
                    }

                    .progress {
                        width:
                            100%;
                        height:
                            10px;
                        margin-top:
                            10px;
                        border-radius:
                            10px;
                        background:
                            #e5e7eb;
                        overflow:
                            hidden;
                    }

                    .progress-bar {
                        height:
                            100%;
                        width:
                            0%;
                        background:
                            #10b981;
                        transition:
                            width .1s linear;
                    }

                    </style>

                    </head>

                    <body>

                    <div class="container">

                    <div class="header">

                        <h1>
                            DropLink
                        </h1>

                        <p>
                            ${files.size}
                            file(s) available
                        </p>

                    </div>

                    <div class="card">

                        <div class="card-title">
                            Send files to this device
                        </div>

                        <input
                            id="files"
                            type="file"
                            multiple
                        >

                        <button
                            id="uploadButton"
                            class="upload-button"
                            onclick="uploadFiles()"
                        >
                            Upload Files
                        </button>

                        <div
                            id="status"
                            class="status"
                        >
                            Select files to upload.
                        </div>

                    </div>

                    <div class="card">

                        <div class="card-title">
                            Files available
                        </div>
                    """.trimIndent()
                )

                if (files.isEmpty()) {

                    append(
                        """
                        <div class="status">
                            No files available.
                        </div>
                        """.trimIndent()
                    )

                } else {

                    files.forEachIndexed { index, file ->

                        val encodedName =
                            android.net.Uri.encode(
                                file.name
                            )

                        append(
                            """
                            <div class="file">

                                <div
                                    class="file-name"
                                >
                                    ${escapeHtml(file.name)}
                                </div>

                                <div
                                    class="file-size"
                                >
                                    ${formatSize(file.size)}
                                </div>

                                <a
                                    class="download"
                                    href="/download/$index/$encodedName"
                                >
                                    Download
                                </a>

                            </div>
                            """.trimIndent()
                        )
                    }
                }

                append(
                    """

                    </div>

                    </div>

                    <script>

                    function formatSize(bytes) {

                        if (bytes < 1024)
                            return bytes + " B";

                        if (bytes < 1024 * 1024)
                            return
                                (bytes / 1024)
                                .toFixed(1) + " KB";

                        if (bytes < 1024 * 1024 * 1024)
                            return
                                (bytes / (1024 * 1024))
                                .toFixed(1) + " MB";

                        return
                            (bytes /
                                (1024 * 1024 * 1024))
                            .toFixed(2) + " GB";
                    }

                    function uploadFiles() {

                        const input =
                            document.getElementById(
                                "files"
                            );

                        const button =
                            document.getElementById(
                                "uploadButton"
                            );

                        const status =
                            document.getElementById(
                                "status"
                            );

                        const files =
                            input.files;

                        if (!files.length) {

                            status.innerText =
                                "Please select a file.";

                            return;
                        }

                        button.disabled = true;

                        uploadNext(
                            files,
                            0,
                            button,
                            status
                        );
                    }

                    function uploadNext(
                        files,
                        index,
                        button,
                        status
                    ) {

                        if (
                            index >=
                            files.length
                        ) {

                            status.innerText =
                                "All files uploaded successfully.";

                            button.disabled =
                                false;

                            return;
                        }

                        const file =
                            files[index];

                        status.innerHTML =
                            "Uploading <b>" +
                            file.name +
                            "</b><br>" +
                            formatSize(0) +
                            " / " +
                            formatSize(file.size) +
                            "<div class='progress'>" +
                            "<div id='progressBar' " +
                            "class='progress-bar'>" +
                            "</div></div>";

                        const xhr =
                            new XMLHttpRequest();

                        xhr.open(
                            "POST",
                            "/upload",
                            true
                        );

                        xhr.setRequestHeader(
                            "X-File-Name",
                            encodeURIComponent(
                                file.name
                            )
                        );

                        xhr.setRequestHeader(
                            "X-File-Type",
                            file.type ||
                            "application/octet-stream"
                        );

                        xhr.setRequestHeader(
                            "X-File-Size",
                            file.size.toString()
                        );

                        xhr.upload.onprogress =
                            function(event) {

                                if (!event.lengthComputable)
                                    return;

                                const percent =
                                    (event.loaded /
                                        event.total) *
                                    100;

                                const bar =
                                    document.getElementById(
                                        "progressBar"
                                    );

                                if (bar) {
                                    bar.style.width =
                                        percent + "%";
                                }

                                status.innerHTML =
                                    "Uploading <b>" +
                                    file.name +
                                    "</b><br>" +
                                    formatSize(
                                        event.loaded
                                    ) +
                                    " / " +
                                    formatSize(
                                        event.total
                                    ) +
                                    " (" +
                                    percent.toFixed(1) +
                                    "%)" +
                                    "<div class='progress'>" +
                                    "<div id='progressBar' " +
                                    "class='progress-bar' " +
                                    "style='width:" +
                                    percent +
                                    "%'>" +
                                    "</div></div>";
                            };

                        xhr.onload =
                            function() {

                                if (
                                    xhr.status >= 200 &&
                                    xhr.status < 300
                                ) {

                                    status.innerText =
                                        file.name +
                                        " uploaded successfully.";

                                    uploadNext(
                                        files,
                                        index + 1,
                                        button,
                                        status
                                    );

                                } else {

                                    status.innerText =
                                        "Upload failed: " +
                                        file.name;

                                    button.disabled =
                                        false;
                                }
                            };

                        xhr.onerror =
                            function() {

                                status.innerText =
                                    "Network error while uploading " +
                                    file.name;

                                button.disabled =
                                    false;
                            };

                        xhr.send(file);
                    }

                    </script>

                    </body>
                    </html>
                    """.trimIndent()
                )
            }

        sendResponse(
            output,
            "200 OK",
            "text/html; charset=utf-8",
            html.toByteArray(
                Charsets.UTF_8
            )
        )
    }

    // ---------------------------------------------------------
    // FILE DOWNLOAD
    // ---------------------------------------------------------

    private fun sendFile(
        output: BufferedOutputStream,
        path: String
    ) {

        val parts =
            path
                .removePrefix("/")
                .split("/")

        if (
            parts.size < 2 ||
            parts[0] != "download"
        ) {

            sendText(
                output,
                "404 Not Found",
                "File not found"
            )

            return
        }

        val index =
            parts[1].toIntOrNull()

        if (index == null) {

            sendText(
                output,
                "404 Not Found",
                "Invalid file index"
            )

            return
        }

        val file =
            sharedFiles.getOrNull(index)

        if (file == null) {

            sendText(
                output,
                "404 Not Found",
                "File not found"
            )

            return
        }

        android.util.Log.d(
            "DropLink",
            "Download requested: ${file.name}"
        )

        try {

            val inputStream =
                contentResolver.openInputStream(
                    file.uri
                )

            if (inputStream == null) {

                sendText(
                    output,
                    "404 Not Found",
                    "Unable to open selected file"
                )

                return
            }

            inputStream.use { input ->

                val contentLength =
                    file.size

                val mimeType =
                    file.mimeType
                        ?: "application/octet-stream"

                val safeName =
                    escapeHeader(file.name)

                val header =
                    buildString {

                        append(
                            "HTTP/1.1 200 OK\r\n"
                        )

                        append(
                            "Content-Type: $mimeType\r\n"
                        )

                        if (contentLength > 0) {

                            append(
                                "Content-Length: $contentLength\r\n"
                            )
                        }

                        append(
                            "Content-Disposition: attachment; filename=\"$safeName\"\r\n"
                        )

                        append(
                            "Cache-Control: no-cache\r\n"
                        )

                        append(
                            "Connection: close\r\n"
                        )

                        append(
                            "\r\n"
                        )
                    }

                output.write(
                    header.toByteArray(
                        Charsets.UTF_8
                    )
                )

                output.flush()

                val buffer =
                    ByteArray(
                        1024 * 1024
                    )

                var totalBytes =
                    0L

                while (true) {

                    val bytesRead =
                        input.read(buffer)

                    if (bytesRead == -1) {
                        break
                    }

                    output.write(
                        buffer,
                        0,
                        bytesRead
                    )

                    totalBytes +=
                        bytesRead

                    output.flush()
                }

                android.util.Log.d(
                    "DropLink",
                    "Download completed: " +
                        "${file.name}, " +
                        "$totalBytes bytes"
                )
            }

        } catch (e: Exception) {

            android.util.Log.e(
                "DropLink",
                "FILE STREAM ERROR",
                e
            )
        }
    }

    // ---------------------------------------------------------
    // UPLOAD
    // ---------------------------------------------------------

    private fun handleUpload(
        input: BufferedInputStream,
        output: BufferedOutputStream,
        request: String
    ) {

        val contentLength =
            getHeader(
                request,
                "Content-Length"
            )
                ?.toLongOrNull()

        if (
            contentLength == null ||
            contentLength < 0
        ) {

            sendText(
                output,
                "411 Length Required",
                "Content-Length is required."
            )

            return
        }

        val encodedName =
            getHeader(
                request,
                "X-File-Name"
            )

        val requestedName =
            try {

                if (
                    encodedName != null
                ) {

                    URLDecoder.decode(
                        encodedName,
                        "UTF-8"
                    )

                } else {

                    "uploaded_file"
                }

            } catch (_: Exception) {

                "uploaded_file"
            }

        val mimeType =
            getHeader(
                request,
                "X-File-Type"
            )
                ?.takeIf {
                    it.isNotBlank()
                }
                ?: "application/octet-stream"

        /*
         * The body of the POST request is the
         * actual file.
         *
         * Therefore we can stream it directly
         * to disk without storing it in RAM.
         */
        val destination =
            createUploadDestination(
                requestedName,
                mimeType
            )

        android.util.Log.d(
            "DropLink",
            "UPLOAD START"
        )

        android.util.Log.d(
            "DropLink",
            "Name: $requestedName"
        )

        android.util.Log.d(
            "DropLink",
            "Type: $mimeType"
        )

        android.util.Log.d(
            "DropLink",
            "Size: $contentLength"
        )

        android.util.Log.d(
            "DropLink",
            "Destination: ${destination.absolutePath}"
        )

        try {

            FileOutputStream(
                destination
            ).use { fileOutput ->

                val buffer =
                    ByteArray(
                        1024 * 1024
                    )

                var remaining =
                    contentLength

                var received =
                    0L

                while (
                    remaining > 0
                ) {

                    val requested =
                        minOf(
                            buffer.size.toLong(),
                            remaining
                        ).toInt()

                    val bytesRead =
                        input.read(
                            buffer,
                            0,
                            requested
                        )

                    if (
                        bytesRead == -1
                    ) {
                        throw Exception(
                            "Connection closed before upload completed."
                        )
                    }

                    fileOutput.write(
                        buffer,
                        0,
                        bytesRead
                    )

                    received +=
                        bytesRead

                    remaining -=
                        bytesRead
                }

                fileOutput.flush()

                android.util.Log.d(
                    "DropLink",
                    "UPLOAD COMPLETE: " +
                        "$received bytes"
                )
            }

            sendText(
                output,
                "200 OK",
                "Upload completed: ${destination.name}"
            )

        } catch (e: Exception) {

            try {

                destination.delete()

            } catch (_: Exception) {
            }

            android.util.Log.e(
                "DropLink",
                "UPLOAD ERROR",
                e
            )

            sendText(
                output,
                "500 Internal Server Error",
                "Upload failed: ${e.message}"
            )
        }
    }

    // ---------------------------------------------------------
    // CREATE UPLOAD DESTINATION
    // ---------------------------------------------------------

    private fun createUploadDestination(
        originalName: String,
        mimeType: String
    ): File {

        val safeName =
            sanitizeFileName(
                originalName
            )

        val directoryName =
            getUploadDirectoryName(
                safeName,
                mimeType
            )

        /*
         * Primary location:
         *
         * Android public Downloads/DropLink/
         *
         * This makes received files visible
         * to the user and to Android file managers.
         */
        val root =
            File(
                Environment
                    .getExternalStoragePublicDirectory(
                        Environment.DIRECTORY_DOWNLOADS
                    ),
                "DropLink"
            )

        val directory =
            File(
                root,
                directoryName
            )

        if (!directory.exists()) {
            directory.mkdirs()
        }

        return createUniqueFile(
            directory,
            safeName
        )
    }

    // ---------------------------------------------------------
    // FILE CATEGORY
    // ---------------------------------------------------------

    private fun getUploadDirectoryName(
        fileName: String,
        mimeType: String
    ): String {

        val type =
            mimeType.lowercase()

        if (
            type.startsWith("image/")
        ) {
            return "Images"
        }

        if (
            type.startsWith("video/")
        ) {
            return "Videos"
        }

        if (
            type.startsWith("audio/")
        ) {
            return "Audio"
        }

        val extension =
            fileName
                .substringAfterLast(
                    ".",
                    ""
                )
                .lowercase()

        return when (extension) {

            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "bmp",
            "heic",
            "heif" ->
                "Images"

            "mp4",
            "mkv",
            "avi",
            "mov",
            "webm",
            "3gp",
            "m4v" ->
                "Videos"

            "mp3",
            "wav",
            "aac",
            "flac",
            "ogg",
            "m4a" ->
                "Audio"

            "pdf",
            "doc",
            "docx",
            "xls",
            "xlsx",
            "ppt",
            "pptx",
            "txt",
            "csv",
            "rtf",
            "odt" ->
                "Documents"

            "zip",
            "rar",
            "7z",
            "tar",
            "gz" ->
                "Archives"

            else ->
                "Others"
        }
    }

    // ---------------------------------------------------------
    // UNIQUE FILE
    // ---------------------------------------------------------

    private fun createUniqueFile(
        directory: File,
        originalName: String
    ): File {

        val original =
            File(
                directory,
                originalName
            )

        if (!original.exists()) {
            return original
        }

        val dotIndex =
            originalName.lastIndexOf(".")

        val baseName =
            if (
                dotIndex > 0
            ) {

                originalName
                    .substring(
                        0,
                        dotIndex
                    )

            } else {

                originalName
            }

        val extension =
            if (
                dotIndex > 0
            ) {

                originalName
                    .substring(
                        dotIndex
                    )

            } else {

                ""
            }

        var counter =
            1

        while (true) {

            val candidate =
                File(
                    directory,
                    "$baseName ($counter)$extension"
                )

            if (!candidate.exists()) {
                return candidate
            }

            counter++
        }
    }

    // ---------------------------------------------------------
    // FILE NAME SANITIZATION
    // ---------------------------------------------------------

    private fun sanitizeFileName(
        value: String
    ): String {

        var name =
            value
                .replace(
                    "\\",
                    "_"
                )
                .replace(
                    "/",
                    "_"
                )
                .replace(
                    ":",
                    "_"
                )
                .replace(
                    "*",
                    "_"
                )
                .replace(
                    "?",
                    "_"
                )
                .replace(
                    "\"",
                    "_"
                )
                .replace(
                    "<",
                    "_"
                )
                .replace(
                    ">",
                    "_"
                )
                .replace(
                    "|",
                    "_"
                )
                .replace(
                    "\r",
                    ""
                )
                .replace(
                    "\n",
                    ""
                )
                .trim()

        if (name.isEmpty()) {
            name = "uploaded_file"
        }

        /*
         * Avoid "." and "..".
         */
        if (
            name == "." ||
            name == ".."
        ) {
            name = "uploaded_file"
        }

        /*
         * Keep filenames at a reasonable
         * filesystem-safe length.
         */
        if (name.length > 240) {

            val extension =
                name.substringAfterLast(
                    ".",
                    ""
                )

            name =
                if (
                    extension.isNotEmpty() &&
                    name.contains(".")
                ) {

                    val base =
                        name.substringBeforeLast(
                            "."
                        )

                    base
                        .take(220) +
                        "." +
                        extension
                            .take(20)

                } else {

                    name.take(240)
                }
        }

        return name
    }

    // ---------------------------------------------------------
    // HTTP RESPONSE
    // ---------------------------------------------------------

    private fun sendResponse(
        output: BufferedOutputStream,
        status: String,
        contentType: String,
        data: ByteArray
    ) {

        val header =
            buildString {

                append(
                    "HTTP/1.1 $status\r\n"
                )

                append(
                    "Content-Type: $contentType\r\n"
                )

                append(
                    "Content-Length: ${data.size}\r\n"
                )

                append(
                    "Connection: close\r\n"
                )

                append(
                    "\r\n"
                )
            }

        output.write(
            header.toByteArray(
                Charsets.UTF_8
            )
        )

        output.write(
            data
        )

        output.flush()
    }

    private fun sendText(
        output: BufferedOutputStream,
        status: String,
        text: String
    ) {

        sendResponse(
            output,
            status,
            "text/plain; charset=utf-8",
            text.toByteArray(
                Charsets.UTF_8
            )
        )
    }

    // ---------------------------------------------------------
    // HTML ESCAPING
    // ---------------------------------------------------------

    private fun escapeHtml(
        value: String
    ): String {

        return value
            .replace(
                "&",
                "&amp;"
            )
            .replace(
                "<",
                "&lt;"
            )
            .replace(
                ">",
                "&gt;"
            )
            .replace(
                "\"",
                "&quot;"
            )
            .replace(
                "'",
                "&#039;"
            )
    }

    // ---------------------------------------------------------
    // HTTP HEADER ESCAPING
    // ---------------------------------------------------------

    private fun escapeHeader(
        value: String
    ): String {

        return value
            .replace(
                "\\",
                ""
            )
            .replace(
                "\"",
                ""
            )
            .replace(
                "\r",
                ""
            )
            .replace(
                "\n",
                ""
            )
    }

    // ---------------------------------------------------------
    // FILE SIZE
    // ---------------------------------------------------------

    private fun formatSize(
        size: Long
    ): String {

        if (size < 1024) {
            return "$size B"
        }

        if (
            size <
            1024 * 1024
        ) {

            return "${
                size / 1024
            } KB"
        }

        if (
            size <
            1024L *
            1024L *
            1024L
        ) {

            return "%.2f MB".format(
                size /
                    (
                        1024.0 *
                        1024.0
                    )
            )
        }

        return "%.2f GB".format(
            size /
                (
                    1024.0 *
                    1024.0 *
                    1024.0
                )
        )
    }
}