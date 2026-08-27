package com.muqaddas123.droplink.internetshare

import java.net.InetAddress
import java.net.InetSocketAddress
import android.content.ContentResolver
import android.net.Uri
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStream
import java.io.InputStreamReader
import java.io.OutputStream
import java.io.OutputStreamWriter
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.ConcurrentHashMap

data class InternetSharedFile(
    val id: String,
    val uri: Uri,
    val name: String,
    val mimeType: String?,
    val size: Long
)

private class DownloadProgress(
    val total: Long,
    @Volatile var downloaded: Long = 0L,
    @Volatile var startedAt: Long = System.currentTimeMillis(),
    @Volatile var finishedAt: Long = 0L,
    @Volatile var done: Boolean = false,
    @Volatile var cancelled: Boolean = false,
    @Volatile var socket: Socket? = null
)

class InternetTransferServer(
    private val contentResolver: ContentResolver
) {

    companion object {
        private const val TAG = "DropLinkInternet"
        private const val SOCKET_BUFFER_SIZE = 1024 * 1024
        private const val SERVER_BACKLOG = 128
    }

    private var serverSocket: ServerSocket? = null

    private val executor =
        Executors.newCachedThreadPool()

    @Volatile
    private var running = false

    @Volatile
    private var paused = false

    @Volatile
    private var files: List<InternetSharedFile> =
        emptyList()

    private val downloadProgress =
        ConcurrentHashMap<String, DownloadProgress>()

    var port: Int = 0
        private set

    var bindAddress: InetAddress? = null
        private set

    fun setFiles(
        sharedFiles: List<InternetSharedFile>
    ) {
        files = sharedFiles.toList()

        android.util.Log.d(
            TAG,
            "FILES SET: ${files.size}"
        )
    }

    /**
     * Starts the server.
     *
     * IMPORTANT:
     *
     * We do NOT bind the socket to the selected IPv6
     * address.
     *
     * ServerSocket(0, 50) listens on all local interfaces.
     *
     * NetworkUtils is still used to determine which
     * public IPv6 address should be displayed to the user.
     */
    @Synchronized
    fun start(): Int {

        if (running && serverSocket != null) {
            return port
        }

        try {

            /*
             * IMPORTANT:
             *
             * Do NOT use:
             *
             * ServerSocket(0, 50, address)
             *
             * Use wildcard binding instead.
             */
            serverSocket = ServerSocket().apply {
                reuseAddress = true
                receiveBufferSize = SOCKET_BUFFER_SIZE
                bind(InetSocketAddress(0), SERVER_BACKLOG)
            }

            port =
                serverSocket!!.localPort

            running = true
            paused = false

            val internetAddress =
                NetworkUtils
                    .getInternetNetworkAddress()

            bindAddress =
                internetAddress?.address

            android.util.Log.d(
                TAG,
                "================================"
            )

            android.util.Log.d(
                TAG,
                "SERVER STARTED"
            )

            android.util.Log.d(
                TAG,
                "PORT: $port"
            )

            android.util.Log.d(
                TAG,
                "PUBLIC ADDRESS: " +
                    (
                        bindAddress
                            ?.hostAddress
                            ?: "NONE"
                    )
            )

            if (bindAddress != null) {

                android.util.Log.d(
                    TAG,
                    "SHARE URL: " +
                        getServerUrl()
                )
            }

            android.util.Log.d(
                TAG,
                "================================"
            )

            executor.execute {

                while (running) {

                    try {

                        val socket =
                            serverSocket
                                ?.accept()
                                ?: break

                        // Keep the transfer window full and avoid delaying
                        // small HTTP control packets behind file data.
                        socket.tcpNoDelay = true
                        socket.keepAlive = true
                        socket.sendBufferSize = SOCKET_BUFFER_SIZE
                        socket.receiveBufferSize = SOCKET_BUFFER_SIZE

                        android.util.Log.d(
                            TAG,
                            "CLIENT CONNECTED: " +
                                socket.inetAddress
                                    .hostAddress
                        )

                        executor.execute {
                            handleClient(socket)
                        }

                    } catch (e: Exception) {

                        if (running) {

                            android.util.Log.e(
                                TAG,
                                "ACCEPT ERROR",
                                e
                            )
                        }
                    }
                }
            }

            return port

        } catch (e: Exception) {

            android.util.Log.e(
                TAG,
                "SERVER START ERROR",
                e
            )

            running = false
            port = 0
            bindAddress = null

            try {
                serverSocket?.close()
            } catch (_: Exception) {
            }

            serverSocket = null

            throw e
        }
    }

    /**
     * Returns:
     *
     * IPv4:
     * http://1.2.3.4:12345/
     *
     * IPv6:
     * http://[2001:db8::1]:12345/
     */
    fun getServerUrl(): String? {

        val address =
            bindAddress
                ?.hostAddress
                ?: NetworkUtils
                    .getInternetNetworkAddress()
                    ?.address
                    ?.hostAddress
                ?: return null

        if (port <= 0) {
            return null
        }

        return if (address.contains(":")) {

            "http://[$address]:$port/"

        } else {

            "http://$address:$port/"
        }
    }

    fun pause() {

        paused = true

        android.util.Log.d(
            TAG,
            "SERVER PAUSED"
        )
    }

    fun resume() {

        paused = false

        android.util.Log.d(
            TAG,
            "SERVER RESUMED"
        )
    }

    @Synchronized
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
            TAG,
            "SERVER STOPPED"
        )
    }

    private fun handleClient(
        socket: Socket
    ) {

        socket.use {

            try {

                it.soTimeout = 30_000

                val reader =
                    BufferedReader(
                        InputStreamReader(
                            it.getInputStream(),
                            Charsets.ISO_8859_1
                        )
                    )

                val output =
                    it.getOutputStream()

                /*
                 * HTTP request line.
                 */
                val requestLine =
                    reader.readLine()
                        ?: return

                android.util.Log.d(
                    TAG,
                    "REQUEST: $requestLine"
                )

                /*
                 * HTTP headers.
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

                        headers[key] = value
                    }
                }

                val parts =
                    requestLine.split(
                        " ",
                        limit = 3
                    )

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

                val decodedRequest =
                    URLDecoder.decode(
                        rawPath,
                        "UTF-8"
                    )

                val queryIndex = decodedRequest.indexOf('?')

                val path =
                    if (queryIndex >= 0) {
                        decodedRequest.substring(0, queryIndex)
                    } else {
                        decodedRequest
                    }

                val query =
                    if (queryIndex >= 0) {
                        decodedRequest.substring(queryIndex + 1)
                    } else {
                        ""
                    }

                val queryParams = parseQuery(query)

                when {

                    path == "/" -> {

                        sendHomePage(
                            output
                        )
                    }

                    path == "/api/files" -> {

                        sendFileList(
                            output
                        )
                    }

                    path == "/api/download-status" -> {

                        sendDownloadStatus(
                            output,
                            queryParams["id"]
                        )
                    }

                    path == "/api/cancel-download" -> {

                        cancelDownload(
                            output,
                            queryParams["id"]
                        )
                    }

                    path.startsWith(
                        "/download/"
                    ) -> {

                        val fileId =
                            path.removePrefix(
                                "/download/"
                            )

                        val downloadId = queryParams["downloadId"]

                        sendFile(
                            output,
                            method,
                            fileId,
                            headers["range"],
                            downloadId,
                            it
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
                        TAG,
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
            if (files.isEmpty()) {
                """
                <div class="empty">
                    No files are currently shared.
                </div>
                """.trimIndent()
            } else {
                files.joinToString("\n") { file ->

                    val safeName =
                        escapeHtml(file.name)

                    val size =
                        formatSize(file.size)

                    """
                    <div class="file">
                        <div class="fileInfo">
                            <div class="name">$safeName</div>
                            <div class="size">$size</div>
                        </div>

                        <a
                            class="download"
                            data-file-id="${escapeHtml(file.id)}"
                            data-file-name="$safeName"
                            data-file-size="${file.size}"
                            href="/download/${file.id}"
                        >
                            Download
                        </a>
                    </div>
                    """.trimIndent()
                }
            }

        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>DropLink</title>
            <style>
                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    padding: 24px;
                    font-family: Arial, sans-serif;
                    background: #f5f7fb;
                    color: #111827;
                }
                .container { max-width: 700px; margin: auto; }
                .card {
                    background: white;
                    border-radius: 20px;
                    padding: 24px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
                }
                h1 { margin-top: 0; margin-bottom: 6px; }
                .subtitle { color: #6b7280; margin-top: 0; }
                .file {
                    margin-top: 14px;
                    padding: 16px;
                    border-radius: 14px;
                    background: #f3f4f6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                }
                .fileInfo { min-width: 0; flex: 1; }
                .name { font-weight: 700; word-break: break-word; }
                .size { margin-top: 5px; color: #6b7280; font-size: 13px; }
                .download {
                    text-decoration: none;
                    color: white;
                    background: #2563eb;
                    padding: 11px 16px;
                    border-radius: 10px;
                    font-weight: 700;
                    white-space: nowrap;
                }
                .downloadAll {
                    width: 100%;
                    border: 0;
                    color: white;
                    background: #111827;
                    padding: 13px 16px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 15px;
                    cursor: pointer;
                    margin: 12px 0 4px;
                }
                .downloadAll:disabled { opacity: 0.6; cursor: not-allowed; }
                .progressCard {
                    display: none;
                    margin-top: 16px;
                    padding: 16px;
                    border-radius: 14px;
                    background: #eef2ff;
                }
                .progressTop {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    align-items: flex-start;
                }
                .progressName { font-weight: 700; word-break: break-word; }
                .progressStatus { color: #6b7280; font-size: 13px; margin-top: 4px; }
                .progressPercent { font-weight: 700; white-space: nowrap; }
                .bar {
                    width: 100%;
                    height: 12px;
                    margin-top: 14px;
                    border-radius: 999px;
                    overflow: hidden;
                    background: #dbe2ea;
                }
                .barFill {
                    width: 0%;
                    height: 100%;
                    background: #2563eb;
                    transition: width 0.2s linear;
                }
                .stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-top: 12px;
                }
                .stat {
                    padding: 9px;
                    border-radius: 10px;
                    background: white;
                    font-size: 12px;
                    color: #6b7280;
                }
                .stat strong {
                    display: block;
                    margin-top: 3px;
                    color: #111827;
                    font-size: 13px;
                }
                .cancelDownload {
                    width: 100%;
                    margin-top: 12px;
                    border: 0;
                    background: #dc2626;
                    color: white;
                    padding: 11px 14px;
                    border-radius: 10px;
                    font-weight: 700;
                    cursor: pointer;
                }
                .empty {
                    padding: 20px;
                    text-align: center;
                    color: #6b7280;
                }
                @media (max-width: 520px) {
                    body { padding: 12px; }
                    .card { padding: 16px; }
                    .file { align-items: stretch; flex-direction: column; }
                    .download { text-align: center; }
                    .stats { grid-template-columns: 1fr; }
                }
            </style>
        </head>
        <body>
        <div class="container">
            <div class="card">
                <h1>DropLink</h1>
                <p class="subtitle">Files shared from this device</p>

                <button
                    class="downloadAll"
                    id="downloadAll"
                    type="button"
                    ${if (files.isEmpty()) "disabled" else ""}
                >
                    ${if (files.isEmpty()) "No files to download" else "Download All"}
                </button>

                <div class="progressCard" id="progressCard" aria-live="polite">
                    <div class="progressTop">
                        <div>
                            <div class="progressName" id="progressName">Preparing...</div>
                            <div class="progressStatus" id="progressStatus">Waiting to start</div>
                        </div>
                        <div class="progressPercent" id="progressPercent">0%</div>
                    </div>

                    <div class="bar">
                        <div class="barFill" id="barFill"></div>
                    </div>

                    <div class="stats">
                        <div class="stat">Downloaded<strong id="downloadedText">0 B</strong></div>
                        <div class="stat">Remaining<strong id="remainingText">0 B</strong></div>
                        <div class="stat">Speed<strong id="speedText">0 B/s</strong></div>
                    </div>

                    <button
                        class="cancelDownload"
                        id="cancelDownload"
                        type="button"
                    >
                        Skip / Cancel Current
                    </button>
                </div>

                $fileHtml
            </div>
        </div>

        <script>
            (function () {
                const allButton = document.getElementById('downloadAll');
                const progressCard = document.getElementById('progressCard');
                const progressName = document.getElementById('progressName');
                const progressStatus = document.getElementById('progressStatus');
                const progressPercent = document.getElementById('progressPercent');
                const barFill = document.getElementById('barFill');
                const downloadedText = document.getElementById('downloadedText');
                const remainingText = document.getElementById('remainingText');
                const speedText = document.getElementById('speedText');
                const cancelButton = document.getElementById('cancelDownload');

                const links = Array.from(document.querySelectorAll('.download'));
                let queue = [];
                let queueIndex = 0;
                let activeId = null;
                let pollTimer = null;
                let lastBytes = 0;
                let lastTime = 0;
                let cancelling = false;

                function formatBytes(bytes) {
                    if (!Number.isFinite(bytes) || bytes < 0) bytes = 0;
                    if (bytes < 1024) return Math.round(bytes) + ' B';
                    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
                }

                function formatSpeed(bytesPerSecond) {
                    return formatBytes(bytesPerSecond) + '/s';
                }

                function stopPolling() {
                    if (pollTimer) {
                        clearTimeout(pollTimer);
                        pollTimer = null;
                    }
                }

                function resetProgress(file) {
                    progressCard.style.display = 'block';
                    progressName.textContent = file.name;
                    progressStatus.textContent = 'Starting download...';
                    progressPercent.textContent = '0%';
                    barFill.style.width = '0%';
                    downloadedText.textContent = '0 B';
                    remainingText.textContent = formatBytes(file.size);
                    speedText.textContent = '0 B/s';
                    lastBytes = 0;
                    lastTime = Date.now();
                    cancelling = false;
                    cancelButton.disabled = false;
                }

                async function pollStatus(file) {
                    if (!activeId) return;

                    try {
                        const response = await fetch(
                            '/api/download-status?id=' + encodeURIComponent(activeId),
                            { cache: 'no-store' }
                        );

                        const data = await response.json();

                        if (data.status === 'not_found') {
                            progressStatus.textContent = 'Starting download...';
                            pollTimer = setTimeout(function () {
                                pollStatus(file);
                            }, 300);
                            return;
                        }

                        const downloaded = Math.max(0, Number(data.downloaded) || 0);
                        const total = Math.max(0, Number(data.total) || file.size || 0);
                        const remaining = Math.max(0, total - downloaded);
                        const now = Date.now();
                        const elapsed = Math.max(1, now - lastTime);
                        const speed = Math.max(0, ((downloaded - lastBytes) * 1000) / elapsed);
                        const percent = total > 0 ? Math.min(100, (downloaded / total) * 100) : 100;

                        lastBytes = downloaded;
                        lastTime = now;

                        progressPercent.textContent = Math.round(percent) + '%';
                        barFill.style.width = percent + '%';
                        downloadedText.textContent = formatBytes(downloaded);
                        remainingText.textContent = formatBytes(remaining);
                        speedText.textContent = formatSpeed(speed);

                        if (data.cancelled) {
                            progressStatus.textContent = 'Cancelled. Starting next file...';
                            stopPolling();
                            activeId = null;
                            cancelling = false;
                            queueIndex++;
                            setTimeout(startNext, 150);
                            return;
                        }

                        if (data.done) {
                            progressStatus.textContent = 'Completed. Starting next file...';
                            stopPolling();
                            activeId = null;
                            queueIndex++;
                            setTimeout(startNext, 350);
                            return;
                        }

                        progressStatus.textContent = 'Downloading...';
                        pollTimer = setTimeout(function () {
                            pollStatus(file);
                        }, 350);
                    } catch (error) {
                        progressStatus.textContent = 'Checking download status...';
                        pollTimer = setTimeout(function () {
                            pollStatus(file);
                        }, 700);
                    }
                }

                function startNext() {
                    if (queueIndex >= queue.length) {
                        activeId = null;
                        allButton.disabled = false;
                        allButton.textContent = 'Download All';
                        cancelButton.disabled = true;
                        progressStatus.textContent = 'All downloads completed.';
                        progressPercent.textContent = '100%';
                        barFill.style.width = '100%';
                        return;
                    }

                    const file = queue[queueIndex];
                    activeId = crypto.randomUUID ? crypto.randomUUID() :
                        ('dl-' + Date.now() + '-' + Math.random().toString(16).slice(2));

                    resetProgress(file);
                    allButton.disabled = true;
                    allButton.textContent = 'Downloading ' + (queueIndex + 1) + '/' + queue.length;

                    const tempLink = document.createElement('a');
                    tempLink.href = '/download/' + encodeURIComponent(file.id) +
                        '?downloadId=' + encodeURIComponent(activeId);
                    tempLink.download = '';
                    tempLink.style.display = 'none';
                    document.body.appendChild(tempLink);
                    tempLink.click();
                    tempLink.remove();

                    pollStatus(file);
                }

                allButton.addEventListener('click', function () {
                    if (!links.length) return;
                    stopPolling();
                    queue = links.map(function (link) {
                        return {
                            id: link.getAttribute('data-file-id'),
                            name: link.getAttribute('data-file-name') || 'File',
                            size: Number(link.getAttribute('data-file-size')) || 0
                        };
                    });
                    queueIndex = 0;
                    cancelling = false;
                    startNext();
                });

                cancelButton.addEventListener('click', async function () {
                    if (!activeId || cancelling) return;
                    cancelling = true;
                    cancelButton.disabled = true;
                    progressStatus.textContent = 'Cancelling current download...';

                    try {
                        await fetch(
                            '/api/cancel-download?id=' + encodeURIComponent(activeId),
                            { cache: 'no-store' }
                        );
                    } catch (error) {
                        // The status poll will continue and move to the next file.
                    }
                });
            })();
        </script>
        </body>
        </html>
        """.trimIndent()
    }

    private fun parseQuery(query: String): Map<String, String> {

        if (query.isBlank()) {
            return emptyMap()
        }

        return query
            .split("&")
            .mapNotNull { part ->
                val separator = part.indexOf('=')
                if (separator <= 0) {
                    null
                } else {
                    val key = URLDecoder.decode(
                        part.substring(0, separator),
                        "UTF-8"
                    )
                    val value = URLDecoder.decode(
                        part.substring(separator + 1),
                        "UTF-8"
                    )
                    key to value
                }
            }
            .toMap()
    }

    private fun sendDownloadStatus(
        output: OutputStream,
        downloadId: String?
    ) {

        if (downloadId.isNullOrBlank()) {
            sendJson(
                output,
                "{\"status\":\"not_found\"}"
            )
            return
        }

        val progress =
            downloadProgress[downloadId]

        if (progress == null) {
            sendJson(
                output,
                "{\"status\":\"not_found\"}"
            )
            return
        }

        val json =
            """
            {
              "status":"ok",
              "total":${progress.total},
              "downloaded":${progress.downloaded.coerceAtLeast(0L)},
              "done":${progress.done},
              "cancelled":${progress.cancelled}
            }
            """.trimIndent()

        sendJson(output, json)
    }

    private fun cancelDownload(
        output: OutputStream,
        downloadId: String?
    ) {

        if (downloadId.isNullOrBlank()) {
            sendJson(
                output,
                "{\"status\":\"not_found\"}"
            )
            return
        }

        val progress =
            downloadProgress[downloadId]

        if (progress == null) {
            sendJson(
                output,
                "{\"status\":\"not_found\"}"
            )
            return
        }

        progress.cancelled = true

        try {
            progress.socket?.close()
        } catch (_: Exception) {
        }

        sendJson(
            output,
            "{\"status\":\"cancelled\"}"
        )
    }

    private fun sendJson(
        output: OutputStream,
        json: String
    ) {

        val bytes =
            json.toByteArray(Charsets.UTF_8)

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        writer.write("HTTP/1.1 200 OK\r\n")
        writer.write("Content-Type: application/json; charset=utf-8\r\n")
        writer.write("Content-Length: ${bytes.size}\r\n")
        writer.write("Cache-Control: no-store\r\n")
        writer.write("Access-Control-Allow-Origin: *\r\n")
        writer.write("Connection: close\r\n")
        writer.write("\r\n")
        writer.flush()

        output.write(bytes)
        output.flush()
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

                    append("\"id\":\"")

                    append(
                        escapeJson(
                            file.id
                        )
                    )

                    append("\",")

                    append("\"name\":\"")

                    append(
                        escapeJson(
                            file.name
                        )
                    )

                    append("\",")

                    append("\"mimeType\":\"")

                    append(
                        escapeJson(
                            file.mimeType
                                ?: "application/octet-stream"
                        )
                    )

                    append("\",")

                    append("\"size\":")

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
            "Content-Type: application/json; charset=utf-8\r\n"
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
        rangeHeader: String?,
        downloadId: String?,
        socket: Socket
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

        val progress =
            if (!downloadId.isNullOrBlank() && method == "GET") {
                DownloadProgress(total = totalSize).also {
                    it.socket = socket
                    downloadProgress[downloadId] = it
                }
            } else {
                null
            }

        /*
         * Empty file.
         */
        if (totalSize == 0L) {

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
                "Content-Type: ${
                    file.mimeType
                        ?: "application/octet-stream"
                }\r\n"
            )

            writer.write(
                "Content-Length: 0\r\n"
            )

            writer.write(
                "Accept-Ranges: bytes\r\n"
            )

            writer.write(
                "Content-Disposition: attachment; " +
                    "filename=\"${escapeHeader(file.name)}\"\r\n"
            )

            writer.write(
                "Connection: close\r\n"
            )

            writer.write(
                "\r\n"
            )

            writer.flush()

            progress?.let {
                it.downloaded = 0L
                it.done = true
                it.finishedAt = System.currentTimeMillis()
            }

            return
        }

        val range =
            parseRange(
                rangeHeader,
                totalSize
            )

        /*
         * Invalid Range.
         */
        if (
            rangeHeader != null &&
            range == null
        ) {

            sendRangeError(
                output,
                totalSize
            )

            return
        }

        val start =
            range?.first ?: 0L

        val end =
            range?.second
                ?: (totalSize - 1)

        val contentLength =
            end - start + 1

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
                "Content-Range: " +
                    "bytes $start-$end/$totalSize\r\n"
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

        try {
            streamFileRange(
                output,
                file,
                start,
                contentLength,
                progress
            )

            progress?.let {
                if (!it.cancelled && it.downloaded >= contentLength) {
                    it.downloaded = contentLength
                    it.done = true
                    it.finishedAt = System.currentTimeMillis()
                }
            }
        } catch (e: Exception) {
            progress?.let {
                if (!it.cancelled) {
                    it.cancelled = true
                }
            }
        }
    }

    private fun streamFileRange(
        output: OutputStream,
        file: InternetSharedFile,
        start: Long,
        length: Long,
        progress: DownloadProgress?
    ) {
    val input =
        contentResolver.openInputStream(file.uri)
            ?: return

    input.use {

        skipFully(it, start)

        val buffer = ByteArray(1024 * 1024)

        var remaining = length

        while (remaining > 0 && running) {

            while (paused && running) {
                Thread.sleep(100)
            }

            if (!running) break

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

            if (read <= 0) {
                break
            }

            output.write(
                buffer,
                0,
                read
            )

            remaining -= read
            progress?.let {
                it.downloaded = (length - remaining).coerceAtLeast(0L)
            }
        }

        output.flush()
    }
}    private fun skipFully(
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

                if (input.read() == -1) {
                    break
                }

                remaining--

            } else {

                remaining -= skipped
            }
        }
    }

    /**
     * Supports:
     *
     * bytes=0-999
     * bytes=1000-
     * bytes=-1000
     */
    private fun parseRange(
        value: String?,
        totalSize: Long
    ): Pair<Long, Long>? {

        if (
            value == null ||
            !value.startsWith("bytes=") ||
            totalSize <= 0
        ) {
            return null
        }

        return try {

            val rangeValue =
                value
                    .removePrefix("bytes=")
                    .split(",")
                    .first()
                    .trim()

            val dash =
                rangeValue.indexOf('-')

            if (dash < 0) {
                return null
            }

            val startText =
                rangeValue
                    .substring(
                        0,
                        dash
                    )
                    .trim()

            val endText =
                rangeValue
                    .substring(
                        dash + 1
                    )
                    .trim()

            /*
             * bytes=-1000
             */
            if (startText.isEmpty()) {

                val suffixLength =
                    endText.toLong()

                if (suffixLength <= 0) {
                    return null
                }

                val start =
                    maxOf(
                        0L,
                        totalSize - suffixLength
                    )

                return Pair(
                    start,
                    totalSize - 1
                )
            }

            val start =
                startText.toLong()

            if (
                start < 0 ||
                start >= totalSize
            ) {
                return null
            }

            val end =
                if (endText.isEmpty()) {

                    totalSize - 1

                } else {

                    endText.toLong()
                }

            if (end < start) {
                return null
            }

            Pair(
                start,
                minOf(
                    end,
                    totalSize - 1
                )
            )

        } catch (_: Exception) {

            null
        }
    }

    private fun sendRangeError(
        output: OutputStream,
        totalSize: Long
    ) {

        val body =
            """
            <html>
            <body>
            <h2>416</h2>
            <p>Requested Range Not Satisfiable</p>
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

        writer.write(
            "HTTP/1.1 416 Range Not Satisfiable\r\n"
        )

        writer.write(
            "Content-Range: bytes */$totalSize\r\n"
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
                    (
                        1024.0 *
                        1024.0
                    )
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