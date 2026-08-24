package com.muqaddas123.droplink

import android.content.ContentResolver
import android.net.Uri
import android.os.Environment
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.net.URLEncoder
import java.util.Collections
import java.util.concurrent.Executors

data class SharedFile(
    val uri: Uri,
    val name: String,
    val mimeType: String?,
    val size: Long
)

data class ReceivedFile(
    val name: String,
    val mimeType: String,
    val size: Long,
    val path: String,
    val category: String
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
    private var sharedFiles: List<SharedFile> =
        emptyList()

    private val receivedFiles =
        Collections.synchronizedList(
            mutableListOf<ReceivedFile>()
        )

    var port: Int = 0
        private set


    // =========================================================
    // FILES SHARED BY USER A
    // =========================================================

    fun setFiles(
        files: List<SharedFile>
    ) {

        sharedFiles = files
    }


    // =========================================================
    // RECEIVED FILES
    // =========================================================

    fun getReceivedFiles(): List<ReceivedFile> {

        synchronized(
            receivedFiles
        ) {

            return receivedFiles.toList()
        }
    }


    // =========================================================
    // START
    // =========================================================

    fun start(): Int {

        if (running) {
            return port
        }

        serverSocket =
            ServerSocket(0)

        port =
            serverSocket!!.localPort

        running = true

        executor.execute {

            while (running) {

                try {

                    val socket =
                        serverSocket!!.accept()

                    /*
                     * Every connection gets
                     * its own worker.
                     *
                     * This allows:
                     *
                     * Browser A -> download
                     * Browser B -> upload
                     *
                     * at the same time.
                     */
                    executor.execute {

                        handleClient(
                            socket
                        )
                    }

                } catch (e: Exception) {

                    if (running) {

                        android.util.Log.e(
                            "DropLink",
                            "ACCEPT ERROR",
                            e
                        )
                    }
                }
            }
        }

        android.util.Log.d(
            "DropLink",
            "SERVER STARTED ON PORT $port"
        )

        return port
    }


    // =========================================================
    // STOP
    // =========================================================

    fun stop() {

        running = false

        try {

            serverSocket?.close()

        } catch (_: Exception) {
        }

        serverSocket = null

        sharedFiles =
            emptyList()

        /*
         * Don't delete receivedFiles here.
         *
         * This lets the React Native screen
         * read the files after the transfer.
         */
    }


    // =========================================================
    // CLIENT
    // =========================================================

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

                val request =
                    readRequestHeaders(
                        input
                    )
                        ?: return

                val requestLine =
                    request
                        .substringBefore(
                            "\r\n"
                        )

                val parts =
                    requestLine.split(
                        " "
                    )

                if (
                    parts.size < 2
                ) {
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
                    "$method $decodedPath"
                )


                when {

                    /*
                     * Browser home page
                     */
                    method == "GET" &&
                        (
                            decodedPath == "/" ||
                                decodedPath.isEmpty()
                            ) -> {

                        sendIndexPage(
                            output
                        )
                    }


                    /*
                     * Download
                     */
                    method == "GET" &&
                        decodedPath.startsWith(
                            "/download/"
                        ) -> {

                        sendFile(
                            output,
                            decodedPath
                        )
                    }


                    /*
                     * Browser asks for
                     * received files.
                     */
                    method == "GET" &&
                        decodedPath ==
                        "/received" -> {

                        sendReceivedFilesJson(
                            output
                        )
                    }


                    /*
                     * Upload
                     */
                    method == "POST" &&
                        decodedPath ==
                        "/upload" -> {

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


    // =========================================================
    // HTTP HEADER READER
    // =========================================================

    private fun readRequestHeaders(
        input: BufferedInputStream
    ): String? {

        val builder =
            StringBuilder()

        var previous =
            -1

        while (true) {

            val current =
                input.read()

            if (
                current == -1
            ) {

                return null
            }

            builder.append(
                current.toChar()
            )

            if (
                previous ==
                '\r'.code &&
                current ==
                '\n'.code
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

            previous =
                current

            /*
             * Prevent enormous
             * HTTP headers.
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


    // =========================================================
    // GET HEADER
    // =========================================================

    private fun getHeader(
        request: String,
        name: String
    ): String? {

        val target =
            name.lowercase()

        return request
            .split(
                "\r\n"
            )
            .drop(1)
            .firstOrNull {

                it.substringBefore(
                    ":"
                )
                    .trim()
                    .lowercase() ==
                    target
            }
            ?.substringAfter(
                ":",
                ""
            )
            ?.trim()
    }


    // =========================================================
    // INDEX PAGE
    // =========================================================

    private fun sendIndexPage(
        output: BufferedOutputStream
    ) {

        val html =
            buildString {

                append(
                    """
<!DOCTYPE html>
<html>

<head>

<meta
    charset="UTF-8"
>

<meta
    name="viewport"
    content="width=device-width, initial-scale=1"
>

<title>DropLink</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 20px;
    font-family: Arial, sans-serif;
    background: #f5f7fb;
    color: #111827;
}

.container {
    max-width: 720px;
    margin: auto;
}

.header {
    background: #2563eb;
    color: white;
    padding: 28px;
    border-radius: 22px;
    margin-bottom: 20px;
}

.header h1 {
    margin: 0;
    font-size: 28px;
}

.header p {
    margin-top: 8px;
    opacity: .9;
}

.card {
    background: white;
    border-radius: 18px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow:
        0 2px 10px rgba(0,0,0,.05);
}

.card-title {
    font-size: 19px;
    font-weight: 800;
    margin-bottom: 14px;
}

.file {
    background: #f8fafc;
    border-radius: 14px;
    padding: 15px;
    margin-bottom: 10px;
}

.file-name {
    font-weight: bold;
    word-break: break-word;
}

.file-size {
    color: #6b7280;
    margin-top: 5px;
    margin-bottom: 10px;
}

.download {
    display: inline-block;
    padding: 10px 16px;
    border-radius: 10px;
    background: #2563eb;
    color: white;
    text-decoration: none;
    font-weight: 600;
}

input[type=file] {
    width: 100%;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    background: white;
}

.upload-button {
    width: 100%;
    margin-top: 12px;
    padding: 13px;
    border: none;
    border-radius: 12px;
    background: #10b981;
    color: white;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
}

.upload-button:disabled {
    opacity: .6;
}

.status {
    margin-top: 14px;
    padding: 12px;
    border-radius: 10px;
    background: #f3f4f6;
    font-size: 13px;
}

.progress {
    width: 100%;
    height: 10px;
    margin-top: 10px;
    border-radius: 10px;
    background: #e5e7eb;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    width: 0%;
    background: #10b981;
    transition: width .1s linear;
}

.received-file {
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 10px;
}

.received-category {
    display: inline-block;
    margin-top: 7px;
    padding: 4px 8px;
    border-radius: 7px;
    background: #d1fae5;
    color: #047857;
    font-size: 11px;
    font-weight: bold;
}

.empty {
    color: #6b7280;
    font-size: 13px;
}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1>DropLink</h1>

<p>
Send and receive files directly.
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
Files available from this device
</div>

"""
                )

                if (
                    sharedFiles.isEmpty()
                ) {

                    append(
                        """
<div class="empty">
No shared files.
</div>
"""
                    )

                } else {

                    sharedFiles
                        .forEachIndexed {
                            index,
                            file ->

                            val encodedName =
                                URLEncoder.encode(
                                    file.name,
                                    "UTF-8"
                                )

                            append(
                                """
<div class="file">

<div class="file-name">
${escapeHtml(file.name)}
</div>

<div class="file-size">
${formatSize(file.size)}
</div>

<a
    class="download"
    href="/download/$index/$encodedName"
>
Download
</a>

</div>
"""
                            )
                        }
                }


                append(
                    """

</div>


<div class="card">

<div class="card-title">
Files received by this device
</div>

<div id="receivedFiles">

<div class="empty">
Checking received files...
</div>

</div>

</div>


</div>


<script>

function formatSize(bytes) {

    bytes = Number(bytes) || 0;

    if (bytes < 1024) {
        return bytes.toFixed(0) + " B";
    }

    if (bytes < 1024 * 1024) {
        return (
            bytes / 1024
        ).toFixed(1) + " KB";
    }

    if (
        bytes <
        1024 * 1024 * 1024
    ) {

        return (
            bytes /
            (1024 * 1024)
        ).toFixed(1) + " MB";
    }

    return (
        bytes /
        (1024 * 1024 * 1024)
    ).toFixed(2) + " GB";
}


function formatSpeed(
    bytesPerSecond
) {

    return (
        formatSize(
            bytesPerSecond
        ) + "/s"
    );
}


function formatTime(
    seconds
) {

    seconds =
        Math.max(
            0,
            Math.floor(
                Number(seconds) || 0
            )
        );

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;

    if (hours > 0) {

        return (
            String(hours).padStart(2, "0") +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(secs).padStart(2, "0")
        );
    }

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
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

    if (
        !files ||
        files.length === 0
    ) {

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
            "✓ All files uploaded successfully.";

        button.disabled =
            false;

        loadReceivedFiles();

        return;
    }


    const file =
        files[index];


    const total =
        Number(file.size) || 0;


    const startedAt =
        Date.now();


    status.innerHTML =
        "Uploading <b>" +
        escapeHtmlJs(
            file.name
        ) +
        "</b>" +

        "<br><br>" +

        "<span id='uploadAmount'>" +
        "0 B / " +
        formatSize(total) +
        "</span>" +

        "<br>" +

        "<span id='uploadPercent'>" +
        "0.0%" +
        "</span>" +

        " · " +

        "<span id='uploadSpeed'>" +
        "0 B/s" +
        "</span>" +

        " · ETA " +

        "<span id='uploadEta'>" +
        "--:--" +
        "</span>" +

        "<div class='progress'>" +

        "<div " +
        "id='progressBar' " +
        "class='progress-bar'>" +

        "</div>" +

        "</div>";


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
        String(total)
    );


    xhr.upload.onprogress =
        function(event) {

            /*
             * IMPORTANT:
             *
             * Do NOT use event.total.
             *
             * We already know the real
             * file size from file.size.
             */
            const loaded =
                Number(
                    event.loaded
                ) || 0;


            const safeTotal =
                total;


            let percent =
                0;


            if (
                safeTotal > 0
            ) {

                percent =
                    (
                        loaded /
                        safeTotal
                    ) * 100;

            } else {

                percent =
                    0;
            }


            percent =
                Math.min(
                    100,
                    Math.max(
                        0,
                        percent
                    )
                );


            const elapsedSeconds =
                Math.max(
                    0.001,
                    (
                        Date.now() -
                        startedAt
                    ) / 1000
                );


            const speed =
                loaded /
                elapsedSeconds;


            const remaining =
                Math.max(
                    0,
                    safeTotal -
                    loaded
                );


            let eta =
                0;


            if (
                speed > 0
            ) {

                eta =
                    remaining /
                    speed;
            }


            const amount =
                document.getElementById(
                    "uploadAmount"
                );


            const percentElement =
                document.getElementById(
                    "uploadPercent"
                );


            const speedElement =
                document.getElementById(
                    "uploadSpeed"
                );


            const etaElement =
                document.getElementById(
                    "uploadEta"
                );


            const bar =
                document.getElementById(
                    "progressBar"
                );


            if (amount) {

                amount.innerText =
                    formatSize(
                        loaded
                    ) +
                    " / " +
                    formatSize(
                        safeTotal
                    );
            }


            if (
                percentElement
            ) {

                percentElement.innerText =
                    percent.toFixed(
                        1
                    ) +
                    "%";
            }


            if (
                speedElement
            ) {

                speedElement.innerText =
                    formatSpeed(
                        speed
                    );
            }


            if (
                etaElement
            ) {

                etaElement.innerText =
                    speed > 0
                        ? formatTime(
                            eta
                        )
                        : "--:--";
            }


            if (bar) {

                bar.style.width =
                    percent +
                    "%";
            }
        };


    xhr.onload =
        function() {

            if (
                xhr.status >= 200 &&
                xhr.status < 300
            ) {

                status.innerHTML =
                    "✓ <b>" +
                    escapeHtmlJs(
                        file.name
                    ) +
                    "</b>" +
                    "<br>" +
                    formatSize(
                        total
                    ) +
                    " uploaded successfully.";


                loadReceivedFiles();


                /*
                 * Start next file.
                 */
                uploadNext(
                    files,
                    index + 1,
                    button,
                    status
                );

            } else {

                status.innerText =
                    "✕ Upload failed: " +
                    file.name +
                    " (" +
                    xhr.status +
                    ")";

                button.disabled =
                    false;
            }
        };


    xhr.onerror =
        function() {

            status.innerText =
                "✕ Network error while uploading " +
                file.name;

            button.disabled =
                false;
        };


    xhr.onabort =
        function() {

            status.innerText =
                "Upload cancelled: " +
                file.name;

            button.disabled =
                false;
        };


    xhr.send(
        file
    );
}


function escapeHtmlJs(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


async function loadReceivedFiles() {

    try {

        const response =
            await fetch(
                "/received"
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "HTTP " +
                response.status
            );
        }


        const files =
            await response.json();


        const container =
            document.getElementById(
                "receivedFiles"
            );


        if (!container) {
            return;
        }


        if (
            !files ||
            files.length === 0
        ) {

            container.innerHTML =
                "<div class='empty'>" +
                "No files received yet." +
                "</div>";

            return;
        }


        container.innerHTML =
            files
                .map(
                    function(file) {

                        return (
                            "<div class='received-file'>" +

                            "<div class='file-name'>" +
                            escapeHtmlJs(
                                file.name
                            ) +
                            "</div>" +

                            "<div class='file-size'>" +
                            formatSize(
                                file.size
                            ) +
                            "</div>" +

                            "<span class='received-category'>" +
                            escapeHtmlJs(
                                file.category
                            ) +
                            "</span>" +

                            "</div>"
                        );
                    }
                )
                .join("");


    } catch (error) {

        console.log(
            "Received files error:",
            error
        );
    }
}


/*
 * Check immediately.
 */
loadReceivedFiles();


/*
 * Refresh every 2 seconds.
 *
 * This means when another device
 * uploads a file, the list appears
 * without restarting the server.
 */
setInterval(
    loadReceivedFiles,
    2000
);

</script>

</body>

</html>
"""
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


    // =========================================================
    // DOWNLOAD
    // =========================================================

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
            parts[0] !=
            "download"
        ) {

            sendText(
                output,
                "404 Not Found",
                "File not found"
            )

            return
        }


        val index =
            parts[1]
                .toIntOrNull()


        if (
            index == null
        ) {

            sendText(
                output,
                "404 Not Found",
                "Invalid file index"
            )

            return
        }


        val file =
            sharedFiles
                .getOrNull(
                    index
                )


        if (
            file == null
        ) {

            sendText(
                output,
                "404 Not Found",
                "File not found"
            )

            return
        }


        try {

            val inputStream =
                contentResolver
                    .openInputStream(
                        file.uri
                    )


            if (
                inputStream == null
            ) {

                sendText(
                    output,
                    "404 Not Found",
                    "Unable to open selected file"
                )

                return
            }


            inputStream.use { input ->

                val mimeType =
                    file.mimeType
                        ?: "application/octet-stream"


                val safeName =
                    escapeHeader(
                        file.name
                    )


                val header =
                    buildString {

                        append(
                            "HTTP/1.1 200 OK\r\n"
                        )

                        append(
                            "Content-Type: $mimeType\r\n"
                        )

                        if (
                            file.size > 0
                        ) {

                            append(
                                "Content-Length: ${file.size}\r\n"
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


                while (true) {

                    val bytesRead =
                        input.read(
                            buffer
                        )


                    if (
                        bytesRead ==
                        -1
                    ) {

                        break
                    }


                    output.write(
                        buffer,
                        0,
                        bytesRead
                    )
                }


                output.flush()
            }


        } catch (e: Exception) {

            android.util.Log.e(
                "DropLink",
                "DOWNLOAD ERROR",
                e
            )
        }
    }


    // =========================================================
    // UPLOAD
    // =========================================================

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
                    encodedName
                        ?.isNotBlank() ==
                    true
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


        val destination =
            createUploadDestination(
                requestedName,
                mimeType
            )


        val category =
            destination.parentFile
                ?.name
                ?: "Others"


        android.util.Log.d(
            "DropLink",
            "UPLOAD START: $requestedName"
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
                        bytesRead ==
                        -1
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


                /*
                 * Only add the file after the
                 * entire upload has completed.
                 */
                val receivedFile =
                    ReceivedFile(
                        name =
                            destination.name,

                        mimeType =
                            mimeType,

                        size =
                            received,

                        path =
                            destination.absolutePath,

                        category =
                            category
                    )


                synchronized(
                    receivedFiles
                ) {

                    receivedFiles.add(
                        receivedFile
                    )
                }


                android.util.Log.d(
                    "DropLink",
                    "UPLOAD COMPLETE: " +
                        destination.absolutePath
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


    // =========================================================
    // CREATE UPLOAD DESTINATION
    // =========================================================

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


        if (
            !directory.exists()
        ) {

            directory.mkdirs()
        }


        if (
            !directory.exists()
        ) {

            throw Exception(
                "Unable to create directory: " +
                    directory.absolutePath
            )
        }


        return createUniqueFile(
            directory,
            safeName
        )
    }


    // =========================================================
    // CATEGORY
    // =========================================================

    private fun getUploadDirectoryName(
        fileName: String,
        mimeType: String
    ): String {

        val type =
            mimeType.lowercase()


        if (
            type.startsWith(
                "image/"
            )
        ) {

            return "Images"
        }


        if (
            type.startsWith(
                "video/"
            )
        ) {

            return "Videos"
        }


        if (
            type.startsWith(
                "audio/"
            )
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


        return when (
            extension
        ) {

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


    // =========================================================
    // UNIQUE NAME
    // =========================================================

    private fun createUniqueFile(
        directory: File,
        originalName: String
    ): File {

        val original =
            File(
                directory,
                originalName
            )


        if (
            !original.exists()
        ) {

            return original
        }


        val dotIndex =
            originalName
                .lastIndexOf(".")


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


            if (
                !candidate.exists()
            ) {

                return candidate
            }


            counter++
        }
    }


    // =========================================================
    // SANITIZE
    // =========================================================

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


        if (
            name.isEmpty() ||
            name == "." ||
            name == ".."
        ) {

            name =
                "uploaded_file"
        }


        if (
            name.length > 240
        ) {

            val dot =
                name.lastIndexOf(".")


            if (
                dot > 0
            ) {

                val base =
                    name
                        .substring(
                            0,
                            dot
                        )
                        .take(220)


                val extension =
                    name
                        .substring(
                            dot
                        )
                        .take(20)


                name =
                    base +
                    extension

            } else {

                name =
                    name.take(240)
            }
        }


        return name
    }


    // =========================================================
    // RECEIVED JSON
    // =========================================================

    private fun sendReceivedFilesJson(
        output: BufferedOutputStream
    ) {

        val files =
            getReceivedFiles()


        val json =
            buildString {

                append("[")


                files.forEachIndexed {
                    index,
                    file ->

                    if (
                        index > 0
                    ) {

                        append(",")
                    }


                    append("{")

                    append(
                        "\"name\":\""
                    )

                    append(
                        escapeJson(
                            file.name
                        )
                    )

                    append("\",")


                    append(
                        "\"mimeType\":\""
                    )

                    append(
                        escapeJson(
                            file.mimeType
                        )
                    )

                    append("\",")


                    append(
                        "\"size\":"
                    )

                    append(
                        file.size
                    )

                    append(",")


                    append(
                        "\"path\":\""
                    )

                    append(
                        escapeJson(
                            file.path
                        )
                    )

                    append("\",")


                    append(
                        "\"category\":\""
                    )

                    append(
                        escapeJson(
                            file.category
                        )
                    )

                    append("\"")


                    append("}")
                }


                append("]")
            }


        sendResponse(
            output,
            "200 OK",
            "application/json; charset=utf-8",
            json.toByteArray(
                Charsets.UTF_8
            )
        )
    }


    // =========================================================
    // RESPONSE
    // =========================================================

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


        output.write(
            data
        )


        output.flush()
    }


    // =========================================================
    // TEXT RESPONSE
    // =========================================================

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


    // =========================================================
    // HTML ESCAPE
    // =========================================================

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


    // =========================================================
    // JSON ESCAPE
    // =========================================================

    private fun escapeJson(
        value: String
    ): String {

        return value
            .replace(
                "\\",
                "\\\\"
            )
            .replace(
                "\"",
                "\\\""
            )
            .replace(
                "\n",
                "\\n"
            )
            .replace(
                "\r",
                "\\r"
            )
            .replace(
                "\t",
                "\\t"
            )
    }


    // =========================================================
    // HTTP HEADER ESCAPE
    // =========================================================

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


    // =========================================================
    // SIZE
    // =========================================================

    private fun formatSize(
        size: Long
    ): String {

        if (
            size < 1024
        ) {

            return "$size B"
        }


        if (
            size <
            1024L * 1024L
        ) {

            return "%.1f KB".format(
                size / 1024.0
            )
        }


        if (
            size <
            1024L *
            1024L *
            1024L
        ) {

            return "%.1f MB".format(
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