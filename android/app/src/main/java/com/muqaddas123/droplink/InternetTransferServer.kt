package com.muqaddas123.droplink

import android.content.ContentResolver
import android.net.Uri
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStream
import java.io.OutputStream
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.util.UUID
import java.util.concurrent.Executors

data class InternetSharedFile(
    val id: String,
    val uri: Uri,
    val name: String,
    val mimeType: String?,
    val size: Long
)

class InternetTransferServer(
    private val contentResolver: ContentResolver
) {

    private var serverSocket: ServerSocket? = null

    private val executor =
        Executors.newCachedThreadPool()

    @Volatile
    private var running = false

    @Volatile
    private var paused = false

    private var files =
        emptyList<InternetSharedFile>()

    var port: Int = 0
        private set

    /*
     * Address currently used by the server.
     */
    var bindAddress: InetAddress? = null
        private set

    fun setFiles(
        sharedFiles: List<InternetSharedFile>
    ) {
        files = sharedFiles
    }

    /*
     * Start server on a specific network address.
     *
     * This is important for Internet Share because
     * Android may have multiple active interfaces:
     *
     * WiFi
     * Hotspot
     * rmnet_data1
     * rmnet_data2
     * etc.
     */
    fun start(
        address: InetAddress
    ): Int {

        if (running) {
            return port
        }

        bindAddress = address

        /*
         * Bind specifically to the selected address.
         *
         * port = 0 means Android chooses a free port.
         */
        serverSocket =
            ServerSocket(
                0,
                50,
                address
            )

        port =
            serverSocket!!.localPort

        running = true
        paused = false

        android.util.Log.d(
            "DropLinkInternet",
            "SERVER STARTED"
        )

        android.util.Log.d(
            "DropLinkInternet",
            "BIND ADDRESS: ${address.hostAddress}"
        )

        android.util.Log.d(
            "DropLinkInternet",
            "PORT: $port"
        )

        executor.execute {

            while (running) {

                try {

                    val socket =
                        serverSocket!!.accept()

                    android.util.Log.d(
                        "DropLinkInternet",
                        "CLIENT CONNECTED: " +
                            socket.inetAddress.hostAddress
                    )

                    executor.execute {
                        handleClient(socket)
                    }

                } catch (e: Exception) {

                    if (running) {

                        android.util.Log.e(
                            "DropLinkInternet",
                            "ACCEPT ERROR",
                            e
                        )
                    }
                }
            }
        }

        return port
    }

    /*
     * Backward-compatible start().
     *
     * If old code still calls start(),
     * use the first usable local address.
     */
    fun start(): Int {

        val address =
            bindAddress
                ?: NetworkUtils.getInternetNetworkAddress()
                    ?.address
                ?: throw IllegalStateException(
                    "No usable Internet network address found."
                )

        return start(address)
    }

    fun pause() {

        paused = true

        android.util.Log.d(
            "DropLinkInternet",
            "SERVER PAUSED"
        )
    }

    fun resume() {

        paused = false

        android.util.Log.d(
            "DropLinkInternet",
            "SERVER RESUMED"
        )
    }

    fun stop() {

        running = false
        paused = false

        try {
            serverSocket?.close()
        } catch (_: Exception) {
        }

        serverSocket = null
        port = 0
        bindAddress = null

        android.util.Log.d(
            "DropLinkInternet",
            "SERVER STOPPED"
        )
    }

    private fun handleClient(
        socket: Socket
    ) {

        socket.use {

            try {

                val reader =
                    BufferedReader(
                        InputStreamReader(
                            socket.getInputStream()
                        )
                    )

                val output =
                    it.getOutputStream()

                /*
                 * Read HTTP request line.
                 */
                val requestLine =
                    reader.readLine()
                        ?: return

                android.util.Log.d(
                    "DropLinkInternet",
                    "REQUEST: $requestLine"
                )

                /*
                 * Read headers.
                 */
                val headers =
                    mutableMapOf<String, String>()

                while (true) {

                    val line =
                        reader.readLine()
                            ?: break

                    if (line.isEmpty()) {
                        break
                    }

                    val separator =
                        line.indexOf(':')

                    if (separator > 0) {

                        val key =
                            line.substring(
                                0,
                                separator
                            )
                                .trim()
                                .lowercase()

                        val value =
                            line.substring(
                                separator + 1
                            )
                                .trim()

                        headers[key] =
                            value
                    }
                }

                val parts =
                    requestLine.split(" ")

                if (parts.size < 2) {

                    sendError(
                        output,
                        400,
                        "Bad Request"
                    )

                    return
                }

                val method =
                    parts[0]

                val rawPath =
                    parts[1]

                if (
                    method != "GET" &&
                    method != "HEAD"
                ) {

                    sendError(
                        output,
                        405,
                        "Method Not Allowed"
                    )

                    return
                }

                val path =
                    URLDecoder.decode(
                        rawPath,
                        "UTF-8"
                    )

                when {

                    path == "/" -> {

                        sendHomePage(
                            output
                        )
                    }

                    path.startsWith(
                        "/download/"
                    ) -> {

                        val fileId =
                            path.removePrefix(
                                "/download/"
                            )

                        sendFile(
                            output,
                            method,
                            fileId,
                            headers["range"]
                        )
                    }

                    path.startsWith(
                        "/api/files"
                    ) -> {

                        sendFileList(
                            output
                        )
                    }

                    else -> {

                        sendError(
                            output,
                            404,
                            "Not Found"
                        )
                    }
                }

            } catch (e: Exception) {

                if (running) {

                    android.util.Log.e(
                        "DropLinkInternet",
                        "CLIENT ERROR",
                        e
                    )
                }
            }
        }
    }

    private fun sendHomePage(
        output: OutputStream
    ) {

        val html =
            buildHomePage()

        val bytes =
            html.toByteArray(
                Charsets.UTF_8
            )

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        writer.write(
            "HTTP/1.1 200 OK\r\n"
        )

        writer.write(
            "Content-Type: text/html; charset=utf-8\r\n"
        )

        writer.write(
            "Content-Length: ${bytes.size}\r\n"
        )

        writer.write(
            "Connection: close\r\n"
        )

        writer.write(
            "Cache-Control: no-store\r\n"
        )

        writer.write(
            "\r\n"
        )

        writer.flush()

        output.write(bytes)
        output.flush()
    }

    private fun buildHomePage(): String {

        val fileHtml =
            files.joinToString("\n") { file ->

                val safeName =
                    escapeHtml(
                        file.name
                    )

                val size =
                    formatSize(
                        file.size
                    )

                """
                <div class="file">
                    <div class="fileInfo">
                        <div class="name">
                            $safeName
                        </div>

                        <div class="size">
                            $size
                        </div>
                    </div>

                    <a
                        class="download"
                        href="/download/${file.id}"
                    >
                        Download
                    </a>
                </div>
                """.trimIndent()
            }

        return """
<!DOCTYPE html>
<html>

<head>

<meta
    name="viewport"
    content="width=device-width,initial-scale=1"
/>

<title>DropLink</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 24px;

    font-family:
        Arial,
        sans-serif;

    background: #f5f7fb;
    color: #111827;
}

.container {
    max-width: 700px;
    margin: auto;
}

.card {
    background: white;

    border-radius: 20px;

    padding: 24px;

    box-shadow:
        0 8px 30px
        rgba(0,0,0,0.08);
}

h1 {
    margin-top: 0;
    margin-bottom: 6px;
}

.subtitle {
    color: #6b7280;
    margin-top: 0;
}

.file {
    margin-top: 14px;

    padding: 16px;

    border-radius: 14px;

    background: #f3f4f6;

    display: flex;

    justify-content:
        space-between;

    align-items: center;

    gap: 12px;
}

.fileInfo {
    min-width: 0;
    flex: 1;
}

.name {
    font-weight: 700;

    word-break:
        break-word;
}

.size {
    margin-top: 5px;

    color: #6b7280;

    font-size: 13px;
}

.download {
    text-decoration: none;

    color: white;

    background: #2563eb;

    padding:
        11px 16px;

    border-radius: 10px;

    font-weight: 700;

    white-space: nowrap;
}

.download:hover {
    background: #1d4ed8;
}

</style>

</head>

<body>

<div class="container">

<div class="card">

<h1>DropLink</h1>

<p class="subtitle">
Files shared from this device
</p>

$fileHtml

</div>

</div>

</body>

</html>
        """.trimIndent()
    }

    private fun sendFileList(
        output: OutputStream
    ) {

        val json =
            buildString {

                append("[")

                files.forEachIndexed {
                    index,
                    file ->

                    if (index > 0) {
                        append(",")
                    }

                    append("{")

                    append(
                        "\"id\":\""
                    )

                    append(
                        escapeJson(
                            file.id
                        )
                    )

                    append("\",")

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
                                ?: "application/octet-stream"
                        )
                    )

                    append("\",")

                    append(
                        "\"size\":"
                    )

                    append(
                        file.size
                    )

                    append("}")
                }

                append("]")
            }

        val bytes =
            json.toByteArray(
                Charsets.UTF_8
            )

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        writer.write(
            "HTTP/1.1 200 OK\r\n"
        )

        writer.write(
            "Content-Type: application/json\r\n"
        )

        writer.write(
            "Content-Length: ${bytes.size}\r\n"
        )

        writer.write(
            "Access-Control-Allow-Origin: *\r\n"
        )

        writer.write(
            "Connection: close\r\n"
        )

        writer.write(
            "\r\n"
        )

        writer.flush()

        output.write(bytes)
        output.flush()
    }

    private fun sendFile(
        output: OutputStream,
        method: String,
        fileId: String,
        rangeHeader: String?
    ) {

        val file =
            files.firstOrNull {
                it.id == fileId
            }

        if (file == null) {

            sendError(
                output,
                404,
                "File not found"
            )

            return
        }

        if (paused) {

            sendError(
                output,
                503,
                "Transfer paused"
            )

            return
        }

        val totalSize =
            file.size

        val range =
            parseRange(
                rangeHeader,
                totalSize
            )

        val start =
            range?.first ?: 0L

        val end =
            range?.second
                ?: (totalSize - 1)

        val contentLength =
            if (totalSize == 0L) {
                0L
            } else {
                end - start + 1
            }

        val partial =
            range != null

        val status =
            if (partial) {
                "206 Partial Content"
            } else {
                "200 OK"
            }

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        writer.write(
            "HTTP/1.1 $status\r\n"
        )

        writer.write(
            "Content-Type: ${
                file.mimeType
                    ?: "application/octet-stream"
            }\r\n"
        )

        writer.write(
            "Content-Length: $contentLength\r\n"
        )

        writer.write(
            "Accept-Ranges: bytes\r\n"
        )

        if (partial) {

            writer.write(
                "Content-Range: bytes " +
                    "$start-$end/$totalSize\r\n"
            )
        }

        writer.write(
            "Content-Disposition: attachment; " +
                "filename=\"${escapeHeader(file.name)}\"\r\n"
        )

        writer.write(
            "Cache-Control: no-store\r\n"
        )

        writer.write(
            "Connection: close\r\n"
        )

        writer.write(
            "\r\n"
        )

        writer.flush()

        if (method == "HEAD") {
            return
        }

        if (contentLength <= 0L) {
            return
        }

        streamFileRange(
            output,
            file,
            start,
            contentLength
        )
    }

    private fun streamFileRange(
        output: OutputStream,
        file: InternetSharedFile,
        start: Long,
        length: Long
    ) {

        val input =
            contentResolver.openInputStream(
                file.uri
            )

        if (input == null) {
            return
        }

        input.use {

            skipFully(
                it,
                start
            )

            val buffer =
                ByteArray(
                    64 * 1024
                )

            var remaining =
                length

            while (
                remaining > 0 &&
                running
            ) {

                /*
                 * Pause support.
                 */
                while (
                    paused &&
                    running
                ) {

                    Thread.sleep(
                        100
                    )
                }

                if (!running) {
                    break
                }

                val wanted =
                    minOf(
                        buffer.size.toLong(),
                        remaining
                    ).toInt()

                val read =
                    it.read(
                        buffer,
                        0,
                        wanted
                    )

                if (read == -1) {
                    break
                }

                output.write(
                    buffer,
                    0,
                    read
                )

                output.flush()

                remaining -=
                    read
            }
        }
    }

    private fun skipFully(
        input: InputStream,
        amount: Long
    ) {

        var remaining =
            amount

        while (remaining > 0) {

            val skipped =
                input.skip(
                    remaining
                )

            if (skipped <= 0) {

                if (
                    input.read() == -1
                ) {
                    break
                }

                remaining--

            } else {

                remaining -=
                    skipped
            }
        }
    }

    private fun parseRange(
        value: String?,
        totalSize: Long
    ): Pair<Long, Long>? {

        if (
            value == null ||
            !value.startsWith(
                "bytes="
            ) ||
            totalSize <= 0
        ) {
            return null
        }

        return try {

            val range =
                value
                    .removePrefix(
                        "bytes="
                    )
                    .split("-")

            val start =
                range[0]
                    .trim()
                    .toLong()

            val end =
                if (
                    range.size > 1 &&
                    range[1]
                        .trim()
                        .isNotEmpty()
                ) {

                    range[1]
                        .trim()
                        .toLong()

                } else {

                    totalSize - 1
                }

            if (
                start < 0 ||
                start >= totalSize ||
                end < start
            ) {

                null

            } else {

                Pair(
                    start,
                    minOf(
                        end,
                        totalSize - 1
                    )
                )
            }

        } catch (_: Exception) {

            null
        }
    }

    private fun sendError(
        output: OutputStream,
        statusCode: Int,
        message: String
    ) {

        val body =
            """
            <html>
            <body>
            <h2>$statusCode</h2>
            <p>${escapeHtml(message)}</p>
            </body>
            </html>
            """.trimIndent()

        val bytes =
            body.toByteArray(
                Charsets.UTF_8
            )

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        val status =
            when (statusCode) {

                400 ->
                    "Bad Request"

                404 ->
                    "Not Found"

                405 ->
                    "Method Not Allowed"

                503 ->
                    "Service Unavailable"

                else ->
                    "Error"
            }

        writer.write(
            "HTTP/1.1 $statusCode $status\r\n"
        )

        writer.write(
            "Content-Type: text/html; charset=utf-8\r\n"
        )

        writer.write(
            "Content-Length: ${bytes.size}\r\n"
        )

        writer.write(
            "Connection: close\r\n"
        )

        writer.write(
            "\r\n"
        )

        writer.flush()

        output.write(bytes)
        output.flush()
    }

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
                "&#39;"
            )
    }

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
    }

    private fun escapeHeader(
        value: String
    ): String {

        return value
            .replace(
                "\"",
                "'"
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

    private fun formatSize(
        bytes: Long
    ): String {

        if (bytes < 1024) {
            return "$bytes B"
        }

        if (
            bytes <
            1024L * 1024L
        ) {

            return "%.1f KB".format(
                bytes / 1024.0
            )
        }

        if (
            bytes <
            1024L *
            1024L *
            1024L
        ) {

            return "%.1f MB".format(
                bytes /
                    (1024.0 * 1024.0)
            )
        }

        return "%.2f GB".format(
            bytes /
                (
                    1024.0 *
                    1024.0 *
                    1024.0
                )
        )
    }

    fun createFile(
        uri: Uri,
        name: String,
        mimeType: String?,
        size: Long
    ): InternetSharedFile {

        return InternetSharedFile(
            id =
                UUID.randomUUID()
                    .toString(),

            uri = uri,

            name = name,

            mimeType = mimeType,

            size = size
        )
    }
}