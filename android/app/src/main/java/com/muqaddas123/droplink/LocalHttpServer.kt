package com.muqaddas123.droplink

import android.content.ContentResolver
import android.net.Uri
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.net.ServerSocket
import java.net.URLDecoder
import java.net.Socket
import java.util.concurrent.Executors

data class SharedFile(
    val uri: Uri,
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

    fun stop() {

        running = false

        try {
            serverSocket?.close()
        } catch (_: Exception) {
        }

        serverSocket = null

        sharedFiles = emptyList()
    }

    private fun handleClient(socket: Socket) {

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
                    readRequest(input)
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
                    parts[0]

                val path =
                    parts[1]

                if (method != "GET") {

                    sendText(
                        output,
                        "405 Method Not Allowed",
                        "Method Not Allowed"
                    )

                    return
                }

                val decodedPath =
                    URLDecoder.decode(
                        path,
                        "UTF-8"
                    )

                if (
                    decodedPath == "/" ||
                    decodedPath.isEmpty()
                ) {

                    sendIndexPage(output)

                } else {

                    sendFile(
                        output,
                        decodedPath
                    )
                }
            }

        } catch (e: Exception) {

            if (running) {
                e.printStackTrace()
            }
        }
    }

    private fun readRequest(
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
                        .endsWith("\r\n\r\n")
                ) {
                    break
                }
            }

            previous = current

            if (builder.length > 32 * 1024) {
                return null
            }
        }

        return builder.toString()
    }

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
                                max-width: 700px;
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

                            .file {
                                background: white;
                                border-radius: 16px;
                                padding: 18px;
                                margin-bottom: 12px;
                                box-shadow:
                                    0 2px 10px
                                    rgba(0,0,0,.05);
                            }

                            .file-name {
                                font-weight: bold;
                                word-break: break-word;
                                margin-bottom: 8px;
                            }

                            .file-size {
                                color: #6b7280;
                                margin-bottom: 14px;
                            }

                            .download {
                                display: inline-block;
                                padding: 11px 18px;
                                border-radius: 10px;
                                background: #2563eb;
                                color: white;
                                text-decoration: none;
                            }

                        </style>

                    </head>

                    <body>

                    <div class="container">

                        <div class="header">

                            <h1>DropLink</h1>

                            <p>
                                ${files.size}
                                file(s) ready
                            </p>

                        </div>
                    """.trimIndent()
                )

                files.forEachIndexed { index, file ->

                    val encodedName =
                        Uri.encode(file.name)

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
                        """.trimIndent()
                    )
                }

                append(
                    """
                    </div>

                    </body>
                    </html>
                    """.trimIndent()
                )
            }

        sendResponse(
            output,
            "200 OK",
            "text/html; charset=utf-8",
            html.toByteArray()
        )
    }

    // ---------------------------------------------------------
    // ZERO-COPY FILE DOWNLOAD
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

        android.util.Log.d(
            "DropLink",
            "URI: ${file.uri}"
        )

        try {

            /*
             * Open the ORIGINAL content:// URI.
             *
             * No temporary file is created.
             */
            val inputStream =
                contentResolver.openInputStream(
                    file.uri
                )

            if (inputStream == null) {

                android.util.Log.e(
                    "DropLink",
                    "ContentResolver returned null InputStream"
                )

                sendText(
                    output,
                    "404 Not Found",
                    "Unable to open selected file"
                )

                return
            }

            inputStream.use { input ->

                /*
                 * Use the size obtained from Android's
                 * OpenableColumns metadata.
                 */
                val contentLength =
                    file.size

                val mimeType =
                    file.mimeType
                        ?: "application/octet-stream"

                val safeName =
                    escapeHeader(file.name)

                /*
                 * Build proper HTTP response headers.
                 */
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

                /*
                 * Stream in 1 MB chunks.
                 *
                 * The complete file is NEVER loaded
                 * into memory and NEVER copied to disk.
                 */
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

                    /*
                     * Flush each chunk so the browser
                     * receives the data continuously.
                     */
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

            /*
             * The HTTP headers may already have been
             * sent, so don't send another HTTP response.
             *
             * Closing the socket will terminate the
             * failed download cleanly.
             */
        }
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

        output.write(data)

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
    // FILE SIZE FORMAT
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